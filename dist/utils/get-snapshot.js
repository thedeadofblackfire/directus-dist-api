"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSnapshot = void 0;
const lodash_1 = require("lodash");
const package_json_1 = require("../../package.json");
const database_1 = __importStar(require("../database"));
const services_1 = require("../services");
const get_schema_1 = require("./get-schema");
const sanitize_schema_1 = require("./sanitize-schema");
async function getSnapshot(options) {
    const database = options?.database ?? (0, database_1.default)();
    const vendor = (0, database_1.getDatabaseClient)(database);
    const schema = options?.schema ?? (await (0, get_schema_1.getSchema)({ database, bypassCache: true }));
    const collectionsService = new services_1.CollectionsService({ knex: database, schema });
    const fieldsService = new services_1.FieldsService({ knex: database, schema });
    const relationsService = new services_1.RelationsService({ knex: database, schema });
    const [collectionsRaw, fieldsRaw, relationsRaw] = await Promise.all([
        collectionsService.readByQuery(),
        fieldsService.readAll(),
        relationsService.readAll(),
    ]);
    const collectionsFiltered = collectionsRaw.filter((item) => excludeSystem(item));
    const fieldsFiltered = fieldsRaw.filter((item) => excludeSystem(item)).map(omitID);
    const relationsFiltered = relationsRaw.filter((item) => excludeSystem(item)).map(omitID);
    const collectionsSorted = (0, lodash_1.sortBy)((0, lodash_1.mapValues)(collectionsFiltered, sortDeep), ['collection']);
    const fieldsSorted = (0, lodash_1.sortBy)((0, lodash_1.mapValues)(fieldsFiltered, sortDeep), ['collection', 'field']);
    const relationsSorted = (0, lodash_1.sortBy)((0, lodash_1.mapValues)(relationsFiltered, sortDeep), ['collection', 'field']);
    return {
        version: 1,
        directus: package_json_1.version,
        vendor,
        collections: collectionsSorted.map((collection) => (0, sanitize_schema_1.sanitizeCollection)(collection)),
        fields: fieldsSorted.map((field) => (0, sanitize_schema_1.sanitizeField)(field)),
        relations: relationsSorted.map((relation) => (0, sanitize_schema_1.sanitizeRelation)(relation)),
    };
}
exports.getSnapshot = getSnapshot;
function excludeSystem(item) {
    if (item?.meta?.system === true)
        return false;
    return true;
}
function omitID(item) {
    return (0, lodash_1.omit)(item, 'meta.id');
}
function sortDeep(raw) {
    if ((0, lodash_1.isPlainObject)(raw)) {
        const mapped = (0, lodash_1.mapValues)(raw, sortDeep);
        const pairs = (0, lodash_1.toPairs)(mapped);
        const sorted = (0, lodash_1.sortBy)(pairs);
        return (0, lodash_1.fromPairs)(sorted);
    }
    if ((0, lodash_1.isArray)(raw)) {
        return (0, lodash_1.sortBy)(raw);
    }
    return raw;
}
