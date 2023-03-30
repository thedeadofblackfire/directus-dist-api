"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSnapshotDiff = void 0;
const deep_diff_1 = require("deep-diff");
const lodash_1 = require("lodash");
const types_1 = require("../types");
const sanitize_schema_1 = require("./sanitize-schema");
function getSnapshotDiff(current, after) {
    const diffedSnapshot = {
        collections: (0, lodash_1.orderBy)([
            ...current.collections.map((currentCollection) => {
                const afterCollection = after.collections.find((afterCollection) => afterCollection.collection === currentCollection.collection);
                return {
                    collection: currentCollection.collection,
                    diff: (0, deep_diff_1.diff)((0, sanitize_schema_1.sanitizeCollection)(currentCollection), (0, sanitize_schema_1.sanitizeCollection)(afterCollection)),
                };
            }),
            ...after.collections
                .filter((afterCollection) => {
                const currentCollection = current.collections.find((currentCollection) => currentCollection.collection === afterCollection.collection);
                return !!currentCollection === false;
            })
                .map((afterCollection) => ({
                collection: afterCollection.collection,
                diff: (0, deep_diff_1.diff)(undefined, (0, sanitize_schema_1.sanitizeCollection)(afterCollection)),
            })),
        ].filter((obj) => Array.isArray(obj.diff)), 'collection'),
        fields: (0, lodash_1.orderBy)([
            ...current.fields.map((currentField) => {
                const afterField = after.fields.find((afterField) => afterField.collection === currentField.collection && afterField.field === currentField.field);
                const isAutoIncrementPrimaryKey = !!currentField.schema?.is_primary_key && !!currentField.schema?.has_auto_increment;
                return {
                    collection: currentField.collection,
                    field: currentField.field,
                    diff: (0, deep_diff_1.diff)((0, sanitize_schema_1.sanitizeField)(currentField, isAutoIncrementPrimaryKey), (0, sanitize_schema_1.sanitizeField)(afterField, isAutoIncrementPrimaryKey)),
                };
            }),
            ...after.fields
                .filter((afterField) => {
                const currentField = current.fields.find((currentField) => currentField.collection === afterField.collection && afterField.field === currentField.field);
                return !!currentField === false;
            })
                .map((afterField) => ({
                collection: afterField.collection,
                field: afterField.field,
                diff: (0, deep_diff_1.diff)(undefined, (0, sanitize_schema_1.sanitizeField)(afterField)),
            })),
        ].filter((obj) => Array.isArray(obj.diff)), ['collection']),
        relations: (0, lodash_1.orderBy)([
            ...current.relations.map((currentRelation) => {
                const afterRelation = after.relations.find((afterRelation) => afterRelation.collection === currentRelation.collection && afterRelation.field === currentRelation.field);
                return {
                    collection: currentRelation.collection,
                    field: currentRelation.field,
                    related_collection: currentRelation.related_collection,
                    diff: (0, deep_diff_1.diff)((0, sanitize_schema_1.sanitizeRelation)(currentRelation), (0, sanitize_schema_1.sanitizeRelation)(afterRelation)),
                };
            }),
            ...after.relations
                .filter((afterRelation) => {
                const currentRelation = current.relations.find((currentRelation) => currentRelation.collection === afterRelation.collection && afterRelation.field === currentRelation.field);
                return !!currentRelation === false;
            })
                .map((afterRelation) => ({
                collection: afterRelation.collection,
                field: afterRelation.field,
                related_collection: afterRelation.related_collection,
                diff: (0, deep_diff_1.diff)(undefined, (0, sanitize_schema_1.sanitizeRelation)(afterRelation)),
            })),
        ].filter((obj) => Array.isArray(obj.diff)), ['collection']),
    };
    /**
     * When you delete a collection, we don't have to individually drop all the fields/relations as well
     */
    const deletedCollections = diffedSnapshot.collections
        .filter((collection) => collection.diff?.[0]?.kind === types_1.DiffKind.DELETE)
        .map(({ collection }) => collection);
    diffedSnapshot.fields = diffedSnapshot.fields.filter((field) => deletedCollections.includes(field.collection) === false);
    diffedSnapshot.relations = diffedSnapshot.relations.filter((relation) => deletedCollections.includes(relation.collection) === false);
    return diffedSnapshot;
}
exports.getSnapshotDiff = getSnapshotDiff;
