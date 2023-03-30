"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNestedMetaUpdate = exports.applyDiff = void 0;
const deep_diff_1 = require("deep-diff");
const lodash_1 = require("lodash");
const cache_1 = require("../cache");
const database_1 = __importDefault(require("../database"));
const emitter_1 = __importDefault(require("../emitter"));
const logger_1 = __importDefault(require("../logger"));
const services_1 = require("../services");
const types_1 = require("../types");
const get_schema_1 = require("./get-schema");
async function applyDiff(currentSnapshot, snapshotDiff, options) {
    const database = options?.database ?? (0, database_1.default)();
    const schema = options?.schema ?? (await (0, get_schema_1.getSchema)({ database, bypassCache: true }));
    const nestedActionEvents = [];
    const mutationOptions = {
        autoPurgeSystemCache: false,
        bypassEmitAction: (params) => nestedActionEvents.push(params),
    };
    await database.transaction(async (trx) => {
        const collectionsService = new services_1.CollectionsService({ knex: trx, schema });
        const getNestedCollectionsToCreate = (currentLevelCollection) => snapshotDiff.collections.filter(({ diff }) => diff[0].rhs?.meta?.group === currentLevelCollection);
        const getNestedCollectionsToDelete = (currentLevelCollection) => snapshotDiff.collections.filter(({ diff }) => diff[0].lhs?.meta?.group === currentLevelCollection);
        const createCollections = async (collections) => {
            for (const { collection, diff } of collections) {
                if (diff?.[0]?.kind === types_1.DiffKind.NEW && diff[0].rhs) {
                    // We'll nest the to-be-created fields in the same collection creation, to prevent
                    // creating a collection without a primary key
                    const fields = snapshotDiff.fields
                        .filter((fieldDiff) => fieldDiff.collection === collection)
                        .map((fieldDiff) => fieldDiff.diff[0].rhs)
                        .map((fieldDiff) => {
                        // Casts field type to UUID when applying non-PostgreSQL schema onto PostgreSQL database.
                        // This is needed because they snapshots UUID fields as char/varchar with length 36.
                        if (['char', 'varchar'].includes(String(fieldDiff.schema?.data_type).toLowerCase()) &&
                            fieldDiff.schema?.max_length === 36 &&
                            (fieldDiff.schema?.is_primary_key ||
                                (fieldDiff.schema?.foreign_key_table && fieldDiff.schema?.foreign_key_column))) {
                            return (0, lodash_1.merge)(fieldDiff, { type: 'uuid', schema: { data_type: 'uuid', max_length: null } });
                        }
                        else {
                            return fieldDiff;
                        }
                    });
                    try {
                        await collectionsService.createOne({
                            ...diff[0].rhs,
                            fields,
                        }, mutationOptions);
                    }
                    catch (err) {
                        logger_1.default.error(`Failed to create collection "${collection}"`);
                        throw err;
                    }
                    // Now that the fields are in for this collection, we can strip them from the field edits
                    snapshotDiff.fields = snapshotDiff.fields.filter((fieldDiff) => fieldDiff.collection !== collection);
                    await createCollections(getNestedCollectionsToCreate(collection));
                }
            }
        };
        const deleteCollections = async (collections) => {
            for (const { collection, diff } of collections) {
                if (diff?.[0]?.kind === types_1.DiffKind.DELETE) {
                    const relations = schema.relations.filter((r) => r.related_collection === collection || r.collection === collection);
                    if (relations.length > 0) {
                        const relationsService = new services_1.RelationsService({ knex: trx, schema });
                        for (const relation of relations) {
                            try {
                                await relationsService.deleteOne(relation.collection, relation.field, mutationOptions);
                            }
                            catch (err) {
                                logger_1.default.error(`Failed to delete collection "${collection}" due to relation "${relation.collection}.${relation.field}"`);
                                throw err;
                            }
                        }
                        // clean up deleted relations from existing schema
                        schema.relations = schema.relations.filter((r) => r.related_collection !== collection && r.collection !== collection);
                    }
                    await deleteCollections(getNestedCollectionsToDelete(collection));
                    try {
                        await collectionsService.deleteOne(collection, mutationOptions);
                    }
                    catch (err) {
                        logger_1.default.error(`Failed to delete collection "${collection}"`);
                        throw err;
                    }
                }
            }
        };
        // Finds all collections that need to be created
        const filterCollectionsForCreation = ({ diff }) => {
            // Check new collections only
            const isNewCollection = diff[0]?.kind === types_1.DiffKind.NEW;
            if (!isNewCollection)
                return false;
            // Create now if no group
            const groupName = diff[0].rhs.meta?.group;
            if (!groupName)
                return true;
            // Check if parent collection already exists in schema
            const parentExists = currentSnapshot.collections.find((c) => c.collection === groupName) !== undefined;
            // If this is a new collection and the parent collection doesn't exist in current schema ->
            // Check if the parent collection will be created as part of applying this snapshot ->
            // If yes -> this collection will be created recursively
            // If not -> create now
            // (ex.)
            // TopLevelCollection - I exist in current schema
            // 		NestedCollection - I exist in snapshotDiff as a new collection
            //			TheCurrentCollectionInIteration - I exist in snapshotDiff as a new collection but will be created as part of NestedCollection
            const parentWillBeCreatedInThisApply = snapshotDiff.collections.filter(({ collection, diff }) => diff[0]?.kind === types_1.DiffKind.NEW && collection === groupName).length > 0;
            // Has group, but parent is not new, parent is also not being created in this snapshot apply
            if (parentExists && !parentWillBeCreatedInThisApply)
                return true;
            return false;
        };
        // Create top level collections (no group, or highest level in existing group) first,
        // then continue with nested collections recursively
        await createCollections(snapshotDiff.collections.filter(filterCollectionsForCreation));
        // delete top level collections (no group) first, then continue with nested collections recursively
        await deleteCollections(snapshotDiff.collections.filter(({ diff }) => diff[0]?.kind === types_1.DiffKind.DELETE && diff[0].lhs.meta?.group === null));
        for (const { collection, diff } of snapshotDiff.collections) {
            if (diff?.[0]?.kind === types_1.DiffKind.EDIT || diff?.[0]?.kind === types_1.DiffKind.ARRAY) {
                const currentCollection = currentSnapshot.collections.find((field) => {
                    return field.collection === collection;
                });
                if (currentCollection) {
                    try {
                        const newValues = diff.reduce((acc, currentDiff) => {
                            (0, deep_diff_1.applyChange)(acc, undefined, currentDiff);
                            return acc;
                        }, (0, lodash_1.cloneDeep)(currentCollection));
                        await collectionsService.updateOne(collection, newValues, mutationOptions);
                    }
                    catch (err) {
                        logger_1.default.error(`Failed to update collection "${collection}"`);
                        throw err;
                    }
                }
            }
        }
        const fieldsService = new services_1.FieldsService({
            knex: trx,
            schema: await (0, get_schema_1.getSchema)({ database: trx, bypassCache: true }),
        });
        for (const { collection, field, diff } of snapshotDiff.fields) {
            if (diff?.[0]?.kind === types_1.DiffKind.NEW && !isNestedMetaUpdate(diff?.[0])) {
                try {
                    await fieldsService.createField(collection, diff[0].rhs, undefined, mutationOptions);
                }
                catch (err) {
                    logger_1.default.error(`Failed to create field "${collection}.${field}"`);
                    throw err;
                }
            }
            if (diff?.[0]?.kind === types_1.DiffKind.EDIT || diff?.[0]?.kind === types_1.DiffKind.ARRAY || isNestedMetaUpdate(diff[0])) {
                const currentField = currentSnapshot.fields.find((snapshotField) => {
                    return snapshotField.collection === collection && snapshotField.field === field;
                });
                if (currentField) {
                    try {
                        const newValues = diff.reduce((acc, currentDiff) => {
                            (0, deep_diff_1.applyChange)(acc, undefined, currentDiff);
                            return acc;
                        }, (0, lodash_1.cloneDeep)(currentField));
                        await fieldsService.updateField(collection, newValues, mutationOptions);
                    }
                    catch (err) {
                        logger_1.default.error(`Failed to update field "${collection}.${field}"`);
                        throw err;
                    }
                }
            }
            if (diff?.[0]?.kind === types_1.DiffKind.DELETE && !isNestedMetaUpdate(diff?.[0])) {
                try {
                    await fieldsService.deleteField(collection, field, mutationOptions);
                }
                catch (err) {
                    logger_1.default.error(`Failed to delete field "${collection}.${field}"`);
                    throw err;
                }
                // Field deletion also cleans up the relationship. We should ignore any relationship
                // changes attached to this now non-existing field
                snapshotDiff.relations = snapshotDiff.relations.filter((relation) => (relation.collection === collection && relation.field === field) === false);
            }
        }
        const relationsService = new services_1.RelationsService({
            knex: trx,
            schema: await (0, get_schema_1.getSchema)({ database: trx, bypassCache: true }),
        });
        for (const { collection, field, diff } of snapshotDiff.relations) {
            const structure = {};
            for (const diffEdit of diff) {
                (0, lodash_1.set)(structure, diffEdit.path, undefined);
            }
            if (diff?.[0]?.kind === types_1.DiffKind.NEW) {
                try {
                    await relationsService.createOne(diff[0].rhs, mutationOptions);
                }
                catch (err) {
                    logger_1.default.error(`Failed to create relation "${collection}.${field}"`);
                    throw err;
                }
            }
            if (diff?.[0]?.kind === types_1.DiffKind.EDIT || diff?.[0]?.kind === types_1.DiffKind.ARRAY) {
                const currentRelation = currentSnapshot.relations.find((relation) => {
                    return relation.collection === collection && relation.field === field;
                });
                if (currentRelation) {
                    try {
                        const newValues = diff.reduce((acc, currentDiff) => {
                            (0, deep_diff_1.applyChange)(acc, undefined, currentDiff);
                            return acc;
                        }, (0, lodash_1.cloneDeep)(currentRelation));
                        await relationsService.updateOne(collection, field, newValues, mutationOptions);
                    }
                    catch (err) {
                        logger_1.default.error(`Failed to update relation "${collection}.${field}"`);
                        throw err;
                    }
                }
            }
            if (diff?.[0]?.kind === types_1.DiffKind.DELETE) {
                try {
                    await relationsService.deleteOne(collection, field, mutationOptions);
                }
                catch (err) {
                    logger_1.default.error(`Failed to delete relation "${collection}.${field}"`);
                    throw err;
                }
            }
        }
    });
    await (0, cache_1.clearSystemCache)();
    if (nestedActionEvents.length > 0) {
        const updatedSchema = await (0, get_schema_1.getSchema)({ database, bypassCache: true });
        for (const nestedActionEvent of nestedActionEvents) {
            nestedActionEvent.context.schema = updatedSchema;
            emitter_1.default.emitAction(nestedActionEvent.event, nestedActionEvent.meta, nestedActionEvent.context);
        }
    }
}
exports.applyDiff = applyDiff;
function isNestedMetaUpdate(diff) {
    if (!diff)
        return false;
    if (diff.kind !== types_1.DiffKind.NEW && diff.kind !== types_1.DiffKind.DELETE)
        return false;
    if (!diff.path || diff.path.length < 2 || diff.path[0] !== 'meta')
        return false;
    return true;
}
exports.isNestedMetaUpdate = isNestedMetaUpdate;
