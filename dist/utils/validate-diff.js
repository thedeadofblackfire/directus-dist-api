"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApplyDiff = void 0;
const joi_1 = __importDefault(require("joi"));
const index_1 = require("../index");
const snapshot_1 = require("../types/snapshot");
const deepDiffSchema = joi_1.default.object({
    kind: joi_1.default.string()
        .valid(...Object.values(snapshot_1.DiffKind))
        .required(),
    path: joi_1.default.array().items(joi_1.default.string()),
    lhs: joi_1.default.object().when('kind', { is: [snapshot_1.DiffKind.DELETE, snapshot_1.DiffKind.EDIT], then: joi_1.default.required() }),
    rhs: joi_1.default.object().when('kind', { is: [snapshot_1.DiffKind.NEW, snapshot_1.DiffKind.EDIT], then: joi_1.default.required() }),
    index: joi_1.default.number().when('kind', { is: snapshot_1.DiffKind.ARRAY, then: joi_1.default.required() }),
    item: joi_1.default.link('/').when('kind', { is: snapshot_1.DiffKind.ARRAY, then: joi_1.default.required() }),
});
const applyJoiSchema = joi_1.default.object({
    hash: joi_1.default.string().required(),
    diff: joi_1.default.object({
        collections: joi_1.default.array()
            .items(joi_1.default.object({
            collection: joi_1.default.string().required(),
            diff: joi_1.default.array().items(deepDiffSchema).required(),
        }))
            .required(),
        fields: joi_1.default.array()
            .items(joi_1.default.object({
            collection: joi_1.default.string().required(),
            field: joi_1.default.string().required(),
            diff: joi_1.default.array().items(deepDiffSchema).required(),
        }))
            .required(),
        relations: joi_1.default.array()
            .items(joi_1.default.object({
            collection: joi_1.default.string().required(),
            field: joi_1.default.string().required(),
            related_collection: joi_1.default.string().allow(null),
            diff: joi_1.default.array().items(deepDiffSchema).required(),
        }))
            .required(),
    }).required(),
});
/**
 * Validates the diff against the current schema snapshot.
 *
 * @returns True if the diff can be applied (valid & not empty).
 */
function validateApplyDiff(applyDiff, currentSnapshotWithHash) {
    const { error } = applyJoiSchema.validate(applyDiff);
    if (error)
        throw new index_1.InvalidPayloadException(error.message);
    // No changes to apply
    if (applyDiff.diff.collections.length === 0 &&
        applyDiff.diff.fields.length === 0 &&
        applyDiff.diff.relations.length === 0) {
        return false;
    }
    // Diff can be applied due to matching hash
    if (applyDiff.hash === currentSnapshotWithHash.hash)
        return true;
    for (const diffCollection of applyDiff.diff.collections) {
        const collection = diffCollection.collection;
        if (diffCollection.diff[0]?.kind === snapshot_1.DiffKind.NEW) {
            const existingCollection = currentSnapshotWithHash.collections.find((c) => c.collection === diffCollection.collection);
            if (existingCollection) {
                throw new index_1.InvalidPayloadException(`Provided diff is trying to create collection "${collection}" but it already exists. Please generate a new diff and try again.`);
            }
        }
        else if (diffCollection.diff[0]?.kind === snapshot_1.DiffKind.DELETE) {
            const existingCollection = currentSnapshotWithHash.collections.find((c) => c.collection === diffCollection.collection);
            if (!existingCollection) {
                throw new index_1.InvalidPayloadException(`Provided diff is trying to delete collection "${collection}" but it does not exist. Please generate a new diff and try again.`);
            }
        }
    }
    for (const diffField of applyDiff.diff.fields) {
        const field = `${diffField.collection}.${diffField.field}`;
        if (diffField.diff[0]?.kind === snapshot_1.DiffKind.NEW) {
            const existingField = currentSnapshotWithHash.fields.find((f) => f.collection === diffField.collection && f.field === diffField.field);
            if (existingField) {
                throw new index_1.InvalidPayloadException(`Provided diff is trying to create field "${field}" but it already exists. Please generate a new diff and try again.`);
            }
        }
        else if (diffField.diff[0]?.kind === snapshot_1.DiffKind.DELETE) {
            const existingField = currentSnapshotWithHash.fields.find((f) => f.collection === diffField.collection && f.field === diffField.field);
            if (!existingField) {
                throw new index_1.InvalidPayloadException(`Provided diff is trying to delete field "${field}" but it does not exist. Please generate a new diff and try again.`);
            }
        }
    }
    for (const diffRelation of applyDiff.diff.relations) {
        let relation = `${diffRelation.collection}.${diffRelation.field}`;
        if (diffRelation.related_collection)
            relation += `-> ${diffRelation.related_collection}`;
        if (diffRelation.diff[0]?.kind === snapshot_1.DiffKind.NEW) {
            const existingRelation = currentSnapshotWithHash.relations.find((r) => r.collection === diffRelation.collection && r.field === diffRelation.field);
            if (existingRelation) {
                throw new index_1.InvalidPayloadException(`Provided diff is trying to create relation "${relation}" but it already exists. Please generate a new diff and try again.`);
            }
        }
        else if (diffRelation.diff[0]?.kind === snapshot_1.DiffKind.DELETE) {
            const existingRelation = currentSnapshotWithHash.relations.find((r) => r.collection === diffRelation.collection && r.field === diffRelation.field);
            if (!existingRelation) {
                throw new index_1.InvalidPayloadException(`Provided diff is trying to delete relation "${relation}" but it does not exist. Please generate a new diff and try again.`);
            }
        }
    }
    throw new index_1.InvalidPayloadException(`Provided hash does not match the current instance's schema hash, indicating the schema has changed after this diff was generated. Please generate a new diff and try again.`);
}
exports.validateApplyDiff = validateApplyDiff;
