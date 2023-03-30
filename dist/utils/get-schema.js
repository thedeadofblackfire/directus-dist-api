"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchema = void 0;
const schema_1 = __importDefault(require("@directus/schema"));
const utils_1 = require("@directus/shared/utils");
const lodash_1 = require("lodash");
const cache_1 = require("../cache");
const constants_1 = require("../constants");
const database_1 = __importDefault(require("../database"));
const collections_1 = require("../database/system-data/collections");
const fields_1 = require("../database/system-data/fields");
const env_1 = __importDefault(require("../env"));
const logger_1 = __importDefault(require("../logger"));
const services_1 = require("../services");
const get_default_value_1 = __importDefault(require("./get-default-value"));
const get_local_type_1 = __importDefault(require("./get-local-type"));
async function getSchema(options) {
    const database = options?.database || (0, database_1.default)();
    const schemaInspector = (0, schema_1.default)(database);
    let result;
    if (!options?.bypassCache && env_1.default['CACHE_SCHEMA'] !== false) {
        let cachedSchema;
        try {
            cachedSchema = await (0, cache_1.getSchemaCache)();
        }
        catch (err) {
            logger_1.default.warn(err, `[schema-cache] Couldn't retrieve cache. ${err}`);
        }
        if (cachedSchema) {
            result = cachedSchema;
        }
        else {
            result = await getDatabaseSchema(database, schemaInspector);
            try {
                await (0, cache_1.setSchemaCache)(result);
            }
            catch (err) {
                logger_1.default.warn(err, `[schema-cache] Couldn't save cache. ${err}`);
            }
        }
    }
    else {
        result = await getDatabaseSchema(database, schemaInspector);
    }
    return result;
}
exports.getSchema = getSchema;
async function getDatabaseSchema(database, schemaInspector) {
    const result = {
        collections: {},
        relations: [],
    };
    const schemaOverview = await schemaInspector.overview();
    const collections = [
        ...(await database
            .select('collection', 'singleton', 'note', 'sort_field', 'accountability')
            .from('directus_collections')),
        ...collections_1.systemCollectionRows,
    ];
    //console.log('systemCollectionRows', systemCollectionRows.length);
    for (const [collection, info] of Object.entries(schemaOverview)) {
        if ((0, utils_1.toArray)(env_1.default['DB_EXCLUDE_TABLES']).includes(collection)) {
            logger_1.default.trace(`Collection "${collection}" is configured to be excluded and will be ignored`);
            continue;
        }
        if (!info.primary) {
            logger_1.default.warn(`Collection "${collection}" doesn't have a primary key column and will be ignored`);
            continue;
        }
        if (collection.includes(' ')) {
            logger_1.default.warn(`Collection "${collection}" has a space in the name and will be ignored`);
            continue;
        }
        const collectionMeta = collections.find((collectionMeta) => collectionMeta.collection === collection);
        result.collections[collection] = {
            collection,
            primary: info.primary,
            singleton: collectionMeta?.singleton === true || collectionMeta?.singleton === 'true' || collectionMeta?.singleton === 1,
            note: collectionMeta?.note || null,
            sortField: collectionMeta?.sort_field || null,
            accountability: collectionMeta ? collectionMeta.accountability : 'all',
            fields: (0, lodash_1.mapValues)(schemaOverview[collection]?.columns, (column) => {
                return {
                    field: column.column_name,
                    defaultValue: (0, get_default_value_1.default)(column) ?? null,
                    nullable: column.is_nullable ?? true,
                    generated: column.is_generated ?? false,
                    type: (0, get_local_type_1.default)(column),
                    dbType: column.data_type,
                    precision: column.numeric_precision || null,
                    scale: column.numeric_scale || null,
                    special: [],
                    note: null,
                    validation: null,
                    alias: false,
                };
            }),
        };
    }
    console.log('systemFieldRows', fields_1.systemFieldRows.length);
    const fields = [
        ...(await database
            .select('id', 'collection', 'field', 'special', 'note', 'validation')
            .from('directus_fields')),
        ...fields_1.systemFieldRows,
    ].filter((field) => (field.special ? (0, utils_1.toArray)(field.special) : []).includes('no-data') === false);
    for (const field of fields) {
        if (!result.collections[field.collection])
            continue;
        const existing = result.collections[field.collection]?.fields[field.field];
        const column = schemaOverview[field.collection]?.columns[field.field];
        const special = field.special ? (0, utils_1.toArray)(field.special) : [];
        if (constants_1.ALIAS_TYPES.some((type) => special.includes(type)) === false && !existing)
            continue;
        const type = (existing && (0, get_local_type_1.default)(column, { special })) || 'alias';
        let validation = field.validation ?? null;
        if (validation && typeof validation === 'string')
            validation = (0, utils_1.parseJSON)(validation);
        result.collections[field.collection].fields[field.field] = {
            field: field.field,
            defaultValue: existing?.defaultValue ?? null,
            nullable: existing?.nullable ?? true,
            generated: existing?.generated ?? false,
            type: type,
            dbType: existing?.dbType || null,
            precision: existing?.precision || null,
            scale: existing?.scale || null,
            special: special,
            note: field.note,
            alias: existing?.alias ?? true,
            validation: validation ?? null,
        };
    }
    const relationsService = new services_1.RelationsService({ knex: database, schema: result });
    result.relations = await relationsService.readAll();
    return result;
}
