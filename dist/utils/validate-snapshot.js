"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSnapshot = void 0;
const package_json_1 = require("../../package.json");
const exceptions_1 = require("../exceptions");
const database_1 = require("../database");
const joi_1 = __importDefault(require("joi"));
const constants_1 = require("@directus/shared/constants");
const constants_2 = require("../constants");
const types_1 = require("../types");
const snapshotJoiSchema = joi_1.default.object({
    version: joi_1.default.number().valid(1).required(),
    directus: joi_1.default.string().required(),
    vendor: joi_1.default.string()
        .valid(...types_1.DatabaseClients)
        .optional(),
    collections: joi_1.default.array().items(joi_1.default.object({
        collection: joi_1.default.string(),
        meta: joi_1.default.any(),
        schema: joi_1.default.object({
            name: joi_1.default.string(),
        }),
    })),
    fields: joi_1.default.array().items(joi_1.default.object({
        collection: joi_1.default.string(),
        field: joi_1.default.string(),
        meta: joi_1.default.any(),
        schema: joi_1.default.object({
            default_value: joi_1.default.any(),
            max_length: [joi_1.default.number(), joi_1.default.string(), joi_1.default.valid(null)],
            is_nullable: joi_1.default.bool(),
        })
            .unknown()
            .allow(null),
        type: joi_1.default.string()
            .valid(...constants_1.TYPES, ...constants_2.ALIAS_TYPES)
            .allow(null),
    })),
    relations: joi_1.default.array().items(joi_1.default.object({
        collection: joi_1.default.string(),
        field: joi_1.default.string(),
        meta: joi_1.default.any(),
        related_collection: joi_1.default.any(),
        schema: joi_1.default.any(),
    })),
});
/**
 * Validates the snapshot against the current instance.
 **/
function validateSnapshot(snapshot, force = false) {
    const { error } = snapshotJoiSchema.validate(snapshot);
    if (error)
        throw new exceptions_1.InvalidPayloadException(error.message);
    // Bypass checks when "force" option is enabled
    if (force)
        return;
    if (snapshot.directus !== package_json_1.version) {
        throw new exceptions_1.InvalidPayloadException(`Provided snapshot's directus version ${snapshot.directus} does not match the current instance's version ${package_json_1.version}. You can bypass this check by passing the "force" query parameter.`);
    }
    if (!snapshot.vendor) {
        throw new exceptions_1.InvalidPayloadException('Provided snapshot does not contain the "vendor" property. You can bypass this check by passing the "force" query parameter.');
    }
    const currentVendor = (0, database_1.getDatabaseClient)();
    if (snapshot.vendor !== currentVendor) {
        throw new exceptions_1.InvalidPayloadException(`Provided snapshot's vendor ${snapshot.vendor} does not match the current instance's vendor ${currentVendor}. You can bypass this check by passing the "force" query parameter.`);
    }
}
exports.validateSnapshot = validateSnapshot;
