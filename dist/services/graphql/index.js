"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLService = void 0;
const types_1 = require("@directus/shared/types");
const utils_1 = require("@directus/shared/utils");
const argon2_1 = __importDefault(require("argon2"));
const graphql_1 = require("graphql");
const graphql_compose_1 = require("graphql-compose");
const lodash_1 = require("lodash");
const cache_1 = require("../../cache");
const constants_1 = require("../../constants");
const database_1 = __importDefault(require("../../database"));
const env_1 = __importDefault(require("../../env"));
const exceptions_1 = require("../../exceptions");
const extensions_1 = require("../../extensions");
const generate_hash_1 = require("../../utils/generate-hash");
const get_graphql_type_1 = require("../../utils/get-graphql-type");
const reduce_schema_1 = require("../../utils/reduce-schema");
const sanitize_query_1 = require("../../utils/sanitize-query");
const validate_query_1 = require("../../utils/validate-query");
const activity_1 = require("../activity");
const authentication_1 = require("../authentication");
const collections_1 = require("../collections");
const fields_1 = require("../fields");
const files_1 = require("../files");
const flows_1 = require("../flows");
const folders_1 = require("../folders");
const items_1 = require("../items");
const notifications_1 = require("../notifications");
const operations_1 = require("../operations");
const permissions_1 = require("../permissions");
const presets_1 = require("../presets");
const relations_1 = require("../relations");
const revisions_1 = require("../revisions");
const roles_1 = require("../roles");
const server_1 = require("../server");
const settings_1 = require("../settings");
const shares_1 = require("../shares");
const specifications_1 = require("../specifications");
const tfa_1 = require("../tfa");
const users_1 = require("../users");
const utils_2 = require("../utils");
const webhooks_1 = require("../webhooks");
const process_error_1 = __importDefault(require("./utils/process-error"));
const date_1 = require("./types/date");
const geojson_1 = require("./types/geojson");
const string_or_float_1 = require("./types/string-or-float");
const void_1 = require("./types/void");
const constants_2 = require("@directus/shared/constants");
const get_milliseconds_1 = require("../../utils/get-milliseconds");
const bigint_1 = require("./types/bigint");
const hash_1 = require("./types/hash");
const add_path_to_validation_error_1 = require("./utils/add-path-to-validation-error");
const validationRules = Array.from(graphql_1.specifiedRules);
if (env_1.default.GRAPHQL_INTROSPECTION === false) {
    validationRules.push(graphql_1.NoSchemaIntrospectionCustomRule);
}
/**
 * These should be ignored in the context of GraphQL, and/or are replaced by a custom resolver (for non-standard structures)
 */
const SYSTEM_DENY_LIST = [
    'directus_collections',
    'directus_fields',
    'directus_relations',
    'directus_migrations',
    'directus_sessions',
];
const READ_ONLY = ['directus_activity', 'directus_revisions'];
class GraphQLService {
    constructor(options) {
        this.accountability = (options === null || options === void 0 ? void 0 : options.accountability) || null;
        this.knex = (options === null || options === void 0 ? void 0 : options.knex) || (0, database_1.default)();
        this.schema = options.schema;
        this.scope = options.scope;
    }
    /**
     * Execute a GraphQL structure
     */
    async execute({ document, variables, operationName, contextValue, }) {
        var _a;
        const schema = this.getSchema();
        const validationErrors = (0, graphql_1.validate)(schema, document, validationRules).map((validationError) => (0, add_path_to_validation_error_1.addPathToValidationError)(validationError));
        if (validationErrors.length > 0) {
            throw new exceptions_1.GraphQLValidationException({ graphqlErrors: validationErrors });
        }
        let result;
        try {
            result = await (0, graphql_1.execute)({
                schema,
                document,
                contextValue,
                variableValues: variables,
                operationName,
            });
        }
        catch (err) {
            throw new exceptions_1.InvalidPayloadException('GraphQL execution error.', { graphqlErrors: [err.message] });
        }
        const formattedResult = {
            ...result,
            errors: (_a = result.errors) === null || _a === void 0 ? void 0 : _a.map((error) => (0, process_error_1.default)(this.accountability, error)),
        };
        return formattedResult;
    }
    getSchema(type = 'schema') {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const schemaComposer = new graphql_compose_1.SchemaComposer();
        const schema = {
            read: ((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.admin) === true
                ? this.schema
                : (0, reduce_schema_1.reduceSchema)(this.schema, ((_b = this.accountability) === null || _b === void 0 ? void 0 : _b.permissions) || null, ['read']),
            create: ((_c = this.accountability) === null || _c === void 0 ? void 0 : _c.admin) === true
                ? this.schema
                : (0, reduce_schema_1.reduceSchema)(this.schema, ((_d = this.accountability) === null || _d === void 0 ? void 0 : _d.permissions) || null, ['create']),
            update: ((_e = this.accountability) === null || _e === void 0 ? void 0 : _e.admin) === true
                ? this.schema
                : (0, reduce_schema_1.reduceSchema)(this.schema, ((_f = this.accountability) === null || _f === void 0 ? void 0 : _f.permissions) || null, ['update']),
            delete: ((_g = this.accountability) === null || _g === void 0 ? void 0 : _g.admin) === true
                ? this.schema
                : (0, reduce_schema_1.reduceSchema)(this.schema, ((_h = this.accountability) === null || _h === void 0 ? void 0 : _h.permissions) || null, ['delete']),
        };
        const { ReadCollectionTypes } = getReadableTypes();
        const { CreateCollectionTypes, UpdateCollectionTypes, DeleteCollectionTypes } = getWritableTypes();
        const scopeFilter = (collection) => {
            if (this.scope === 'items' && collection.collection.startsWith('directus_') === true)
                return false;
            if (this.scope === 'system') {
                if (collection.collection.startsWith('directus_') === false)
                    return false;
                if (SYSTEM_DENY_LIST.includes(collection.collection))
                    return false;
            }
            return true;
        };
        if (this.scope === 'system') {
            this.injectSystemResolvers(schemaComposer, {
                CreateCollectionTypes,
                ReadCollectionTypes,
                UpdateCollectionTypes,
                DeleteCollectionTypes,
            }, schema);
        }
        const readableCollections = Object.values(schema.read.collections)
            .filter((collection) => collection.collection in ReadCollectionTypes)
            .filter(scopeFilter);
        if (readableCollections.length > 0) {
            schemaComposer.Query.addFields(readableCollections.reduce((acc, collection) => {
                const collectionName = this.scope === 'items' ? collection.collection : collection.collection.substring(9);
                acc[collectionName] = ReadCollectionTypes[collection.collection].getResolver(collection.collection);
                if (this.schema.collections[collection.collection].singleton === false) {
                    acc[`${collectionName}_by_id`] = ReadCollectionTypes[collection.collection].getResolver(`${collection.collection}_by_id`);
                    acc[`${collectionName}_aggregated`] = ReadCollectionTypes[collection.collection].getResolver(`${collection.collection}_aggregated`);
                }
                return acc;
            }, {}));
        }
        else {
            schemaComposer.Query.addFields({
                _empty: {
                    type: void_1.GraphQLVoid,
                    description: "There's no data to query.",
                },
            });
        }
        if (Object.keys(schema.create.collections).length > 0) {
            schemaComposer.Mutation.addFields(Object.values(schema.create.collections)
                .filter((collection) => collection.collection in CreateCollectionTypes && collection.singleton === false)
                .filter(scopeFilter)
                .filter((collection) => READ_ONLY.includes(collection.collection) === false)
                .reduce((acc, collection) => {
                const collectionName = this.scope === 'items' ? collection.collection : collection.collection.substring(9);
                acc[`create_${collectionName}_items`] = CreateCollectionTypes[collection.collection].getResolver(`create_${collection.collection}_items`);
                acc[`create_${collectionName}_item`] = CreateCollectionTypes[collection.collection].getResolver(`create_${collection.collection}_item`);
                return acc;
            }, {}));
        }
        if (Object.keys(schema.update.collections).length > 0) {
            schemaComposer.Mutation.addFields(Object.values(schema.update.collections)
                .filter((collection) => collection.collection in UpdateCollectionTypes)
                .filter(scopeFilter)
                .filter((collection) => READ_ONLY.includes(collection.collection) === false)
                .reduce((acc, collection) => {
                const collectionName = this.scope === 'items' ? collection.collection : collection.collection.substring(9);
                if (collection.singleton) {
                    acc[`update_${collectionName}`] = UpdateCollectionTypes[collection.collection].getResolver(`update_${collection.collection}`);
                }
                else {
                    acc[`update_${collectionName}_items`] = UpdateCollectionTypes[collection.collection].getResolver(`update_${collection.collection}_items`);
                    acc[`update_${collectionName}_batch`] = UpdateCollectionTypes[collection.collection].getResolver(`update_${collection.collection}_batch`);
                    acc[`update_${collectionName}_item`] = UpdateCollectionTypes[collection.collection].getResolver(`update_${collection.collection}_item`);
                }
                return acc;
            }, {}));
        }
        if (Object.keys(schema.delete.collections).length > 0) {
            schemaComposer.Mutation.addFields(Object.values(schema.delete.collections)
                .filter((collection) => collection.singleton === false)
                .filter(scopeFilter)
                .filter((collection) => READ_ONLY.includes(collection.collection) === false)
                .reduce((acc, collection) => {
                const collectionName = this.scope === 'items' ? collection.collection : collection.collection.substring(9);
                acc[`delete_${collectionName}_items`] = DeleteCollectionTypes.many.getResolver(`delete_${collection.collection}_items`);
                acc[`delete_${collectionName}_item`] = DeleteCollectionTypes.one.getResolver(`delete_${collection.collection}_item`);
                return acc;
            }, {}));
        }
        if (type === 'sdl') {
            return schemaComposer.toSDL();
        }
        return schemaComposer.buildSchema();
        /**
         * Construct an object of types for every collection, using the permitted fields per action type
         * as it's fields.
         */
        function getTypes(action) {
            var _a, _b, _c, _d, _e;
            const CollectionTypes = {};
            const CountFunctions = schemaComposer.createObjectTC({
                name: 'count_functions',
                fields: {
                    count: {
                        type: graphql_1.GraphQLInt,
                    },
                },
            });
            const DateFunctions = schemaComposer.createObjectTC({
                name: 'date_functions',
                fields: {
                    year: {
                        type: graphql_1.GraphQLInt,
                    },
                    month: {
                        type: graphql_1.GraphQLInt,
                    },
                    week: {
                        type: graphql_1.GraphQLInt,
                    },
                    day: {
                        type: graphql_1.GraphQLInt,
                    },
                    weekday: {
                        type: graphql_1.GraphQLInt,
                    },
                },
            });
            const TimeFunctions = schemaComposer.createObjectTC({
                name: 'time_functions',
                fields: {
                    hour: {
                        type: graphql_1.GraphQLInt,
                    },
                    minute: {
                        type: graphql_1.GraphQLInt,
                    },
                    second: {
                        type: graphql_1.GraphQLInt,
                    },
                },
            });
            const DateTimeFunctions = schemaComposer.createObjectTC({
                name: 'datetime_functions',
                fields: {
                    ...DateFunctions.getFields(),
                    ...TimeFunctions.getFields(),
                },
            });
            for (const collection of Object.values(schema[action].collections)) {
                if (Object.keys(collection.fields).length === 0)
                    continue;
                if (SYSTEM_DENY_LIST.includes(collection.collection))
                    continue;
                CollectionTypes[collection.collection] = schemaComposer.createObjectTC({
                    name: action === 'read' ? collection.collection : `${action}_${collection.collection}`,
                    fields: Object.values(collection.fields).reduce((acc, field) => {
                        let type = (0, get_graphql_type_1.getGraphQLType)(field.type, field.special);
                        // GraphQL doesn't differentiate between not-null and has-to-be-submitted. We
                        // can't non-null in update, as that would require every not-nullable field to be
                        // submitted on updates
                        if (field.nullable === false &&
                            !field.defaultValue &&
                            !constants_1.GENERATE_SPECIAL.some((flag) => field.special.includes(flag)) &&
                            action !== 'update') {
                            type = new graphql_1.GraphQLNonNull(type);
                        }
                        if (collection.primary === field.field) {
                            if (!field.defaultValue && !field.special.includes('uuid') && action === 'create')
                                type = new graphql_1.GraphQLNonNull(graphql_1.GraphQLID);
                            else if (['create', 'update'].includes(action))
                                type = graphql_1.GraphQLID;
                            else
                                type = new graphql_1.GraphQLNonNull(graphql_1.GraphQLID);
                        }
                        acc[field.field] = {
                            type,
                            description: field.note,
                            resolve: (obj) => {
                                return obj[field.field];
                            },
                        };
                        if (action === 'read') {
                            if (field.type === 'date') {
                                acc[`${field.field}_func`] = {
                                    type: DateFunctions,
                                    resolve: (obj) => {
                                        const funcFields = Object.keys(DateFunctions.getFields()).map((key) => `${field.field}_${key}`);
                                        return (0, lodash_1.mapKeys)((0, lodash_1.pick)(obj, funcFields), (_value, key) => key.substring(field.field.length + 1));
                                    },
                                };
                            }
                            if (field.type === 'time') {
                                acc[`${field.field}_func`] = {
                                    type: TimeFunctions,
                                    resolve: (obj) => {
                                        const funcFields = Object.keys(TimeFunctions.getFields()).map((key) => `${field.field}_${key}`);
                                        return (0, lodash_1.mapKeys)((0, lodash_1.pick)(obj, funcFields), (_value, key) => key.substring(field.field.length + 1));
                                    },
                                };
                            }
                            if (field.type === 'dateTime' || field.type === 'timestamp') {
                                acc[`${field.field}_func`] = {
                                    type: DateTimeFunctions,
                                    resolve: (obj) => {
                                        const funcFields = Object.keys(DateTimeFunctions.getFields()).map((key) => `${field.field}_${key}`);
                                        return (0, lodash_1.mapKeys)((0, lodash_1.pick)(obj, funcFields), (_value, key) => key.substring(field.field.length + 1));
                                    },
                                };
                            }
                            if (field.type === 'json' || field.type === 'alias') {
                                acc[`${field.field}_func`] = {
                                    type: CountFunctions,
                                    resolve: (obj) => {
                                        const funcFields = Object.keys(CountFunctions.getFields()).map((key) => `${field.field}_${key}`);
                                        return (0, lodash_1.mapKeys)((0, lodash_1.pick)(obj, funcFields), (_value, key) => key.substring(field.field.length + 1));
                                    },
                                };
                            }
                        }
                        return acc;
                    }, {}),
                });
            }
            for (const relation of schema[action].relations) {
                if (relation.related_collection) {
                    if (SYSTEM_DENY_LIST.includes(relation.related_collection))
                        continue;
                    (_a = CollectionTypes[relation.collection]) === null || _a === void 0 ? void 0 : _a.addFields({
                        [relation.field]: {
                            type: CollectionTypes[relation.related_collection],
                            resolve: (obj, _, __, info) => {
                                var _a, _b;
                                return obj[(_b = (_a = info === null || info === void 0 ? void 0 : info.path) === null || _a === void 0 ? void 0 : _a.key) !== null && _b !== void 0 ? _b : relation.field];
                            },
                        },
                    });
                    if ((_b = relation.meta) === null || _b === void 0 ? void 0 : _b.one_field) {
                        (_c = CollectionTypes[relation.related_collection]) === null || _c === void 0 ? void 0 : _c.addFields({
                            [relation.meta.one_field]: {
                                type: [CollectionTypes[relation.collection]],
                                resolve: (obj, _, __, info) => {
                                    var _a, _b;
                                    return obj[(_b = (_a = info === null || info === void 0 ? void 0 : info.path) === null || _a === void 0 ? void 0 : _a.key) !== null && _b !== void 0 ? _b : relation.meta.one_field];
                                },
                            },
                        });
                    }
                }
                else if (((_d = relation.meta) === null || _d === void 0 ? void 0 : _d.one_allowed_collections) && action === 'read') {
                    // NOTE: There are no union input types in GraphQL, so this only applies to Read actions
                    (_e = CollectionTypes[relation.collection]) === null || _e === void 0 ? void 0 : _e.addFields({
                        [relation.field]: {
                            type: new graphql_1.GraphQLUnionType({
                                name: `${relation.collection}_${relation.field}_union`,
                                types: relation.meta.one_allowed_collections.map((collection) => CollectionTypes[collection].getType()),
                                resolveType(value, context, info) {
                                    let path = [];
                                    let currentPath = info.path;
                                    while (currentPath.prev) {
                                        path.push(currentPath.key);
                                        currentPath = currentPath.prev;
                                    }
                                    path = path.reverse().slice(0, -1);
                                    let parent = context.data;
                                    for (const pathPart of path) {
                                        parent = parent[pathPart];
                                    }
                                    const collection = parent[relation.meta.one_collection_field];
                                    return CollectionTypes[collection].getType().name;
                                },
                            }),
                            resolve: (obj, _, __, info) => {
                                var _a, _b;
                                return obj[(_b = (_a = info === null || info === void 0 ? void 0 : info.path) === null || _a === void 0 ? void 0 : _a.key) !== null && _b !== void 0 ? _b : relation.field];
                            },
                        },
                    });
                }
            }
            return { CollectionTypes };
        }
        /**
         * Create readable types and attach resolvers for each. Also prepares full filter argument structures
         */
        function getReadableTypes() {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const { CollectionTypes: ReadCollectionTypes } = getTypes('read');
            const ReadableCollectionFilterTypes = {};
            const AggregatedFunctions = {};
            const AggregatedFields = {};
            const AggregateMethods = {};
            const StringFilterOperators = schemaComposer.createInputTC({
                name: 'string_filter_operators',
                fields: {
                    _eq: {
                        type: graphql_1.GraphQLString,
                    },
                    _neq: {
                        type: graphql_1.GraphQLString,
                    },
                    _contains: {
                        type: graphql_1.GraphQLString,
                    },
                    _icontains: {
                        type: graphql_1.GraphQLString,
                    },
                    _ncontains: {
                        type: graphql_1.GraphQLString,
                    },
                    _starts_with: {
                        type: graphql_1.GraphQLString,
                    },
                    _nstarts_with: {
                        type: graphql_1.GraphQLString,
                    },
                    _ends_with: {
                        type: graphql_1.GraphQLString,
                    },
                    _nends_with: {
                        type: graphql_1.GraphQLString,
                    },
                    _in: {
                        type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                    },
                    _nin: {
                        type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                    },
                    _null: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nnull: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _empty: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nempty: {
                        type: graphql_1.GraphQLBoolean,
                    },
                },
            });
            const BooleanFilterOperators = schemaComposer.createInputTC({
                name: 'boolean_filter_operators',
                fields: {
                    _eq: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _neq: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _null: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nnull: {
                        type: graphql_1.GraphQLBoolean,
                    },
                },
            });
            const DateFilterOperators = schemaComposer.createInputTC({
                name: 'date_filter_operators',
                fields: {
                    _eq: {
                        type: graphql_1.GraphQLString,
                    },
                    _neq: {
                        type: graphql_1.GraphQLString,
                    },
                    _gt: {
                        type: graphql_1.GraphQLString,
                    },
                    _gte: {
                        type: graphql_1.GraphQLString,
                    },
                    _lt: {
                        type: graphql_1.GraphQLString,
                    },
                    _lte: {
                        type: graphql_1.GraphQLString,
                    },
                    _null: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nnull: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _in: {
                        type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                    },
                    _nin: {
                        type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                    },
                    _between: {
                        type: new graphql_1.GraphQLList(string_or_float_1.GraphQLStringOrFloat),
                    },
                    _nbetween: {
                        type: new graphql_1.GraphQLList(string_or_float_1.GraphQLStringOrFloat),
                    },
                },
            });
            // Uses StringOrFloat rather than Float to support api dynamic variables (like `$NOW`)
            const NumberFilterOperators = schemaComposer.createInputTC({
                name: 'number_filter_operators',
                fields: {
                    _eq: {
                        type: string_or_float_1.GraphQLStringOrFloat,
                    },
                    _neq: {
                        type: string_or_float_1.GraphQLStringOrFloat,
                    },
                    _in: {
                        type: new graphql_1.GraphQLList(string_or_float_1.GraphQLStringOrFloat),
                    },
                    _nin: {
                        type: new graphql_1.GraphQLList(string_or_float_1.GraphQLStringOrFloat),
                    },
                    _gt: {
                        type: string_or_float_1.GraphQLStringOrFloat,
                    },
                    _gte: {
                        type: string_or_float_1.GraphQLStringOrFloat,
                    },
                    _lt: {
                        type: string_or_float_1.GraphQLStringOrFloat,
                    },
                    _lte: {
                        type: string_or_float_1.GraphQLStringOrFloat,
                    },
                    _null: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nnull: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _between: {
                        type: new graphql_1.GraphQLList(string_or_float_1.GraphQLStringOrFloat),
                    },
                    _nbetween: {
                        type: new graphql_1.GraphQLList(string_or_float_1.GraphQLStringOrFloat),
                    },
                },
            });
            const GeometryFilterOperators = schemaComposer.createInputTC({
                name: 'geometry_filter_operators',
                fields: {
                    _eq: {
                        type: geojson_1.GraphQLGeoJSON,
                    },
                    _neq: {
                        type: geojson_1.GraphQLGeoJSON,
                    },
                    _intersects: {
                        type: geojson_1.GraphQLGeoJSON,
                    },
                    _nintersects: {
                        type: geojson_1.GraphQLGeoJSON,
                    },
                    _intersects_bbox: {
                        type: geojson_1.GraphQLGeoJSON,
                    },
                    _nintersects_bbox: {
                        type: geojson_1.GraphQLGeoJSON,
                    },
                    _null: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nnull: {
                        type: graphql_1.GraphQLBoolean,
                    },
                },
            });
            const HashFilterOperators = schemaComposer.createInputTC({
                name: 'hash_filter_operators',
                fields: {
                    _null: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nnull: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _empty: {
                        type: graphql_1.GraphQLBoolean,
                    },
                    _nempty: {
                        type: graphql_1.GraphQLBoolean,
                    },
                },
            });
            const CountFunctionFilterOperators = schemaComposer.createInputTC({
                name: 'count_function_filter_operators',
                fields: {
                    count: {
                        type: NumberFilterOperators,
                    },
                },
            });
            const DateFunctionFilterOperators = schemaComposer.createInputTC({
                name: 'date_function_filter_operators',
                fields: {
                    year: {
                        type: NumberFilterOperators,
                    },
                    month: {
                        type: NumberFilterOperators,
                    },
                    week: {
                        type: NumberFilterOperators,
                    },
                    day: {
                        type: NumberFilterOperators,
                    },
                    weekday: {
                        type: NumberFilterOperators,
                    },
                },
            });
            const TimeFunctionFilterOperators = schemaComposer.createInputTC({
                name: 'time_function_filter_operators',
                fields: {
                    hour: {
                        type: NumberFilterOperators,
                    },
                    minute: {
                        type: NumberFilterOperators,
                    },
                    second: {
                        type: NumberFilterOperators,
                    },
                },
            });
            const DateTimeFunctionFilterOperators = schemaComposer.createInputTC({
                name: 'datetime_function_filter_operators',
                fields: {
                    ...DateFunctionFilterOperators.getFields(),
                    ...TimeFunctionFilterOperators.getFields(),
                },
            });
            for (const collection of Object.values(schema.read.collections)) {
                if (Object.keys(collection.fields).length === 0)
                    continue;
                if (SYSTEM_DENY_LIST.includes(collection.collection))
                    continue;
                ReadableCollectionFilterTypes[collection.collection] = schemaComposer.createInputTC({
                    name: `${collection.collection}_filter`,
                    fields: Object.values(collection.fields).reduce((acc, field) => {
                        const graphqlType = (0, get_graphql_type_1.getGraphQLType)(field.type, field.special);
                        let filterOperatorType;
                        switch (graphqlType) {
                            case graphql_1.GraphQLBoolean:
                                filterOperatorType = BooleanFilterOperators;
                                break;
                            case bigint_1.GraphQLBigInt:
                            case graphql_1.GraphQLInt:
                            case graphql_1.GraphQLFloat:
                                filterOperatorType = NumberFilterOperators;
                                break;
                            case date_1.GraphQLDate:
                                filterOperatorType = DateFilterOperators;
                                break;
                            case geojson_1.GraphQLGeoJSON:
                                filterOperatorType = GeometryFilterOperators;
                                break;
                            case hash_1.GraphQLHash:
                                filterOperatorType = HashFilterOperators;
                                break;
                            default:
                                filterOperatorType = StringFilterOperators;
                        }
                        acc[field.field] = filterOperatorType;
                        if (field.type === 'date') {
                            acc[`${field.field}_func`] = {
                                type: DateFunctionFilterOperators,
                            };
                        }
                        if (field.type === 'time') {
                            acc[`${field.field}_func`] = {
                                type: TimeFunctionFilterOperators,
                            };
                        }
                        if (field.type === 'dateTime' || field.type === 'timestamp') {
                            acc[`${field.field}_func`] = {
                                type: DateTimeFunctionFilterOperators,
                            };
                        }
                        if (field.type === 'json' || field.type === 'alias') {
                            acc[`${field.field}_func`] = {
                                type: CountFunctionFilterOperators,
                            };
                        }
                        return acc;
                    }, {}),
                });
                ReadableCollectionFilterTypes[collection.collection].addFields({
                    _and: [ReadableCollectionFilterTypes[collection.collection]],
                    _or: [ReadableCollectionFilterTypes[collection.collection]],
                });
                AggregatedFields[collection.collection] = schemaComposer.createObjectTC({
                    name: `${collection.collection}_aggregated_fields`,
                    fields: Object.values(collection.fields).reduce((acc, field) => {
                        const graphqlType = (0, get_graphql_type_1.getGraphQLType)(field.type, field.special);
                        switch (graphqlType) {
                            case bigint_1.GraphQLBigInt:
                            case graphql_1.GraphQLInt:
                            case graphql_1.GraphQLFloat:
                                acc[field.field] = {
                                    type: graphql_1.GraphQLFloat,
                                    description: field.note,
                                };
                                break;
                            default:
                                break;
                        }
                        return acc;
                    }, {}),
                });
                const countType = schemaComposer.createObjectTC({
                    name: `${collection.collection}_aggregated_count`,
                    fields: Object.values(collection.fields).reduce((acc, field) => {
                        acc[field.field] = {
                            type: graphql_1.GraphQLInt,
                            description: field.note,
                        };
                        return acc;
                    }, {}),
                });
                AggregateMethods[collection.collection] = {
                    group: {
                        name: 'group',
                        type: graphql_compose_1.GraphQLJSON,
                    },
                    countAll: {
                        name: 'countAll',
                        type: graphql_1.GraphQLInt,
                    },
                    count: {
                        name: 'count',
                        type: countType,
                    },
                    countDistinct: {
                        name: 'countDistinct',
                        type: countType,
                    },
                };
                const hasNumericAggregates = Object.values(collection.fields).some((field) => {
                    const graphqlType = (0, get_graphql_type_1.getGraphQLType)(field.type, field.special);
                    if (graphqlType === graphql_1.GraphQLInt || graphqlType === graphql_1.GraphQLFloat) {
                        return true;
                    }
                    return false;
                });
                if (hasNumericAggregates) {
                    Object.assign(AggregateMethods[collection.collection], {
                        avg: {
                            name: 'avg',
                            type: AggregatedFields[collection.collection],
                        },
                        sum: {
                            name: 'sum',
                            type: AggregatedFields[collection.collection],
                        },
                        avgDistinct: {
                            name: 'avgDistinct',
                            type: AggregatedFields[collection.collection],
                        },
                        sumDistinct: {
                            name: 'sumDistinct',
                            type: AggregatedFields[collection.collection],
                        },
                        min: {
                            name: 'min',
                            type: AggregatedFields[collection.collection],
                        },
                        max: {
                            name: 'max',
                            type: AggregatedFields[collection.collection],
                        },
                    });
                }
                AggregatedFunctions[collection.collection] = schemaComposer.createObjectTC({
                    name: `${collection.collection}_aggregated`,
                    fields: AggregateMethods[collection.collection],
                });
                ReadCollectionTypes[collection.collection].addResolver({
                    name: collection.collection,
                    args: collection.singleton
                        ? undefined
                        : {
                            filter: ReadableCollectionFilterTypes[collection.collection],
                            sort: {
                                type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                            },
                            limit: {
                                type: graphql_1.GraphQLInt,
                            },
                            offset: {
                                type: graphql_1.GraphQLInt,
                            },
                            page: {
                                type: graphql_1.GraphQLInt,
                            },
                            search: {
                                type: graphql_1.GraphQLString,
                            },
                        },
                    type: collection.singleton
                        ? ReadCollectionTypes[collection.collection]
                        : new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(ReadCollectionTypes[collection.collection].getType()))),
                    resolve: async ({ info, context }) => {
                        const result = await self.resolveQuery(info);
                        context.data = result;
                        return result;
                    },
                });
                ReadCollectionTypes[collection.collection].addResolver({
                    name: `${collection.collection}_aggregated`,
                    type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(AggregatedFunctions[collection.collection].getType()))),
                    args: {
                        groupBy: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                        filter: ReadableCollectionFilterTypes[collection.collection],
                        limit: {
                            type: graphql_1.GraphQLInt,
                        },
                        offset: {
                            type: graphql_1.GraphQLInt,
                        },
                        page: {
                            type: graphql_1.GraphQLInt,
                        },
                        search: {
                            type: graphql_1.GraphQLString,
                        },
                        sort: {
                            type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                        },
                    },
                    resolve: async ({ info, context }) => {
                        const result = await self.resolveQuery(info);
                        context.data = result;
                        return result;
                    },
                });
                if (collection.singleton === false) {
                    ReadCollectionTypes[collection.collection].addResolver({
                        name: `${collection.collection}_by_id`,
                        type: ReadCollectionTypes[collection.collection],
                        args: {
                            id: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                        },
                        resolve: async ({ info, context }) => {
                            const result = await self.resolveQuery(info);
                            context.data = result;
                            return result;
                        },
                    });
                }
            }
            for (const relation of schema.read.relations) {
                if (relation.related_collection) {
                    if (SYSTEM_DENY_LIST.includes(relation.related_collection))
                        continue;
                    (_a = ReadableCollectionFilterTypes[relation.collection]) === null || _a === void 0 ? void 0 : _a.addFields({
                        [relation.field]: ReadableCollectionFilterTypes[relation.related_collection],
                    });
                    (_b = ReadCollectionTypes[relation.collection]) === null || _b === void 0 ? void 0 : _b.addFieldArgs(relation.field, {
                        filter: ReadableCollectionFilterTypes[relation.related_collection],
                        sort: {
                            type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                        },
                        limit: {
                            type: graphql_1.GraphQLInt,
                        },
                        offset: {
                            type: graphql_1.GraphQLInt,
                        },
                        page: {
                            type: graphql_1.GraphQLInt,
                        },
                        search: {
                            type: graphql_1.GraphQLString,
                        },
                    });
                    if ((_c = relation.meta) === null || _c === void 0 ? void 0 : _c.one_field) {
                        (_d = ReadableCollectionFilterTypes[relation.related_collection]) === null || _d === void 0 ? void 0 : _d.addFields({
                            [relation.meta.one_field]: ReadableCollectionFilterTypes[relation.collection],
                        });
                        (_e = ReadCollectionTypes[relation.related_collection]) === null || _e === void 0 ? void 0 : _e.addFieldArgs(relation.meta.one_field, {
                            filter: ReadableCollectionFilterTypes[relation.collection],
                            sort: {
                                type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                            },
                            limit: {
                                type: graphql_1.GraphQLInt,
                            },
                            offset: {
                                type: graphql_1.GraphQLInt,
                            },
                            page: {
                                type: graphql_1.GraphQLInt,
                            },
                            search: {
                                type: graphql_1.GraphQLString,
                            },
                        });
                    }
                }
                else if ((_f = relation.meta) === null || _f === void 0 ? void 0 : _f.one_allowed_collections) {
                    (_g = ReadableCollectionFilterTypes[relation.collection]) === null || _g === void 0 ? void 0 : _g.removeField('item');
                    for (const collection of relation.meta.one_allowed_collections) {
                        (_h = ReadableCollectionFilterTypes[relation.collection]) === null || _h === void 0 ? void 0 : _h.addFields({
                            [`item__${collection}`]: ReadableCollectionFilterTypes[collection],
                        });
                    }
                }
            }
            return { ReadCollectionTypes, ReadableCollectionFilterTypes };
        }
        function getWritableTypes() {
            var _a, _b;
            const { CollectionTypes: CreateCollectionTypes } = getTypes('create');
            const { CollectionTypes: UpdateCollectionTypes } = getTypes('update');
            const DeleteCollectionTypes = {};
            for (const collection of Object.values(schema.create.collections)) {
                if (Object.keys(collection.fields).length === 0)
                    continue;
                if (SYSTEM_DENY_LIST.includes(collection.collection))
                    continue;
                if (collection.collection in CreateCollectionTypes === false)
                    continue;
                const collectionIsReadable = collection.collection in ReadCollectionTypes;
                const creatableFields = ((_a = CreateCollectionTypes[collection.collection]) === null || _a === void 0 ? void 0 : _a.getFields()) || {};
                if (Object.keys(creatableFields).length > 0) {
                    CreateCollectionTypes[collection.collection].addResolver({
                        name: `create_${collection.collection}_items`,
                        type: collectionIsReadable
                            ? new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(ReadCollectionTypes[collection.collection].getType())))
                            : graphql_1.GraphQLBoolean,
                        args: collectionIsReadable
                            ? ReadCollectionTypes[collection.collection].getResolver(collection.collection).getArgs()
                            : undefined,
                        resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                    });
                    CreateCollectionTypes[collection.collection].addResolver({
                        name: `create_${collection.collection}_item`,
                        type: collectionIsReadable ? ReadCollectionTypes[collection.collection] : graphql_1.GraphQLBoolean,
                        resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                    });
                    CreateCollectionTypes[collection.collection].getResolver(`create_${collection.collection}_items`).addArgs({
                        ...CreateCollectionTypes[collection.collection]
                            .getResolver(`create_${collection.collection}_items`)
                            .getArgs(),
                        data: [
                            (0, graphql_compose_1.toInputObjectType)(CreateCollectionTypes[collection.collection]).setTypeName(`create_${collection.collection}_input`).NonNull,
                        ],
                    });
                    CreateCollectionTypes[collection.collection].getResolver(`create_${collection.collection}_item`).addArgs({
                        ...CreateCollectionTypes[collection.collection]
                            .getResolver(`create_${collection.collection}_item`)
                            .getArgs(),
                        data: (0, graphql_compose_1.toInputObjectType)(CreateCollectionTypes[collection.collection]).setTypeName(`create_${collection.collection}_input`).NonNull,
                    });
                }
            }
            for (const collection of Object.values(schema.update.collections)) {
                if (Object.keys(collection.fields).length === 0)
                    continue;
                if (SYSTEM_DENY_LIST.includes(collection.collection))
                    continue;
                if (collection.collection in UpdateCollectionTypes === false)
                    continue;
                const collectionIsReadable = collection.collection in ReadCollectionTypes;
                const updatableFields = ((_b = UpdateCollectionTypes[collection.collection]) === null || _b === void 0 ? void 0 : _b.getFields()) || {};
                if (Object.keys(updatableFields).length > 0) {
                    if (collection.singleton) {
                        UpdateCollectionTypes[collection.collection].addResolver({
                            name: `update_${collection.collection}`,
                            type: collectionIsReadable ? ReadCollectionTypes[collection.collection] : graphql_1.GraphQLBoolean,
                            args: {
                                data: (0, graphql_compose_1.toInputObjectType)(UpdateCollectionTypes[collection.collection]).setTypeName(`update_${collection.collection}_input`).NonNull,
                            },
                            resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                        });
                    }
                    else {
                        UpdateCollectionTypes[collection.collection].addResolver({
                            name: `update_${collection.collection}_batch`,
                            type: collectionIsReadable
                                ? new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(ReadCollectionTypes[collection.collection].getType())))
                                : graphql_1.GraphQLBoolean,
                            args: {
                                ...(collectionIsReadable
                                    ? ReadCollectionTypes[collection.collection].getResolver(collection.collection).getArgs()
                                    : {}),
                                data: [
                                    (0, graphql_compose_1.toInputObjectType)(UpdateCollectionTypes[collection.collection]).setTypeName(`update_${collection.collection}_input`).NonNull,
                                ],
                            },
                            resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                        });
                        UpdateCollectionTypes[collection.collection].addResolver({
                            name: `update_${collection.collection}_items`,
                            type: collectionIsReadable
                                ? new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(ReadCollectionTypes[collection.collection].getType())))
                                : graphql_1.GraphQLBoolean,
                            args: {
                                ...(collectionIsReadable
                                    ? ReadCollectionTypes[collection.collection].getResolver(collection.collection).getArgs()
                                    : {}),
                                ids: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(graphql_1.GraphQLID)),
                                data: (0, graphql_compose_1.toInputObjectType)(UpdateCollectionTypes[collection.collection]).setTypeName(`update_${collection.collection}_input`).NonNull,
                            },
                            resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                        });
                        UpdateCollectionTypes[collection.collection].addResolver({
                            name: `update_${collection.collection}_item`,
                            type: collectionIsReadable ? ReadCollectionTypes[collection.collection] : graphql_1.GraphQLBoolean,
                            args: {
                                id: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                                data: (0, graphql_compose_1.toInputObjectType)(UpdateCollectionTypes[collection.collection]).setTypeName(`update_${collection.collection}_input`).NonNull,
                            },
                            resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                        });
                    }
                }
            }
            DeleteCollectionTypes.many = schemaComposer.createObjectTC({
                name: `delete_many`,
                fields: {
                    ids: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(graphql_1.GraphQLID)),
                },
            });
            DeleteCollectionTypes.one = schemaComposer.createObjectTC({
                name: `delete_one`,
                fields: {
                    id: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                },
            });
            for (const collection of Object.values(schema.delete.collections)) {
                DeleteCollectionTypes.many.addResolver({
                    name: `delete_${collection.collection}_items`,
                    type: DeleteCollectionTypes.many,
                    args: {
                        ids: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(graphql_1.GraphQLID)),
                    },
                    resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                });
                DeleteCollectionTypes.one.addResolver({
                    name: `delete_${collection.collection}_item`,
                    type: DeleteCollectionTypes.one,
                    args: {
                        id: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                    },
                    resolve: async ({ args, info }) => await self.resolveMutation(args, info),
                });
            }
            return { CreateCollectionTypes, UpdateCollectionTypes, DeleteCollectionTypes };
        }
    }
    /**
     * Generic resolver that's used for every "regular" items/system query. Converts the incoming GraphQL AST / fragments into
     * Directus' query structure which is then executed by the services.
     */
    async resolveQuery(info) {
        var _a, _b, _c, _d;
        let collection = info.fieldName;
        if (this.scope === 'system')
            collection = `directus_${collection}`;
        const selections = this.replaceFragmentsInSelections((_b = (_a = info.fieldNodes[0]) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections, info.fragments);
        if (!selections)
            return null;
        const args = this.parseArgs(info.fieldNodes[0].arguments || [], info.variableValues);
        let query;
        const isAggregate = collection.endsWith('_aggregated') && collection in this.schema.collections === false;
        if (isAggregate) {
            query = this.getAggregateQuery(args, selections);
            collection = collection.slice(0, -11);
        }
        else {
            query = this.getQuery(args, selections, info.variableValues);
            if (collection.endsWith('_by_id') && collection in this.schema.collections === false) {
                collection = collection.slice(0, -6);
            }
        }
        if (args.id) {
            query.filter = {
                _and: [
                    query.filter || {},
                    {
                        [this.schema.collections[collection].primary]: {
                            _eq: args.id,
                        },
                    },
                ],
            };
            query.limit = 1;
        }
        // Transform count(a.b.c) into a.b.count(c)
        if ((_c = query.fields) === null || _c === void 0 ? void 0 : _c.length) {
            for (let fieldIndex = 0; fieldIndex < query.fields.length; fieldIndex++) {
                query.fields[fieldIndex] = (0, utils_1.parseFilterFunctionPath)(query.fields[fieldIndex]);
            }
        }
        const result = await this.read(collection, query);
        if (args.id) {
            return (result === null || result === void 0 ? void 0 : result[0]) || null;
        }
        if (query.group) {
            // for every entry in result add a group field based on query.group;
            const aggregateKeys = Object.keys((_d = query.aggregate) !== null && _d !== void 0 ? _d : {});
            result.map((field) => {
                field.group = (0, lodash_1.omit)(field, aggregateKeys);
            });
        }
        return result;
    }
    async resolveMutation(args, info) {
        var _a, _b;
        const action = info.fieldName.split('_')[0];
        let collection = info.fieldName.substring(action.length + 1);
        if (this.scope === 'system')
            collection = `directus_${collection}`;
        const selections = this.replaceFragmentsInSelections((_b = (_a = info.fieldNodes[0]) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections, info.fragments);
        const query = this.getQuery(args, selections || [], info.variableValues);
        const singleton = collection.endsWith('_batch') === false &&
            collection.endsWith('_items') === false &&
            collection.endsWith('_item') === false &&
            collection in this.schema.collections;
        const single = collection.endsWith('_items') === false && collection.endsWith('_batch') === false;
        const batchUpdate = action === 'update' && collection.endsWith('_batch');
        if (collection.endsWith('_batch'))
            collection = collection.slice(0, -6);
        if (collection.endsWith('_items'))
            collection = collection.slice(0, -6);
        if (collection.endsWith('_item'))
            collection = collection.slice(0, -5);
        if (singleton && action === 'update') {
            return await this.upsertSingleton(collection, args.data, query);
        }
        const service = this.getService(collection);
        const hasQuery = (query.fields || []).length > 0;
        try {
            if (single) {
                if (action === 'create') {
                    const key = await service.createOne(args.data);
                    return hasQuery ? await service.readOne(key, query) : true;
                }
                if (action === 'update') {
                    const key = await service.updateOne(args.id, args.data);
                    return hasQuery ? await service.readOne(key, query) : true;
                }
                if (action === 'delete') {
                    await service.deleteOne(args.id);
                    return { id: args.id };
                }
            }
            else {
                if (action === 'create') {
                    const keys = await service.createMany(args.data);
                    return hasQuery ? await service.readMany(keys, query) : true;
                }
                if (action === 'update') {
                    const keys = [];
                    if (batchUpdate) {
                        keys.push(...(await service.updateBatch(args.data)));
                    }
                    else {
                        keys.push(...(await service.updateMany(args.ids, args.data)));
                    }
                    return hasQuery ? await service.readMany(keys, query) : true;
                }
                if (action === 'delete') {
                    const keys = await service.deleteMany(args.ids);
                    return { ids: keys };
                }
            }
        }
        catch (err) {
            return this.formatError(err);
        }
    }
    /**
     * Execute the read action on the correct service. Checks for singleton as well.
     */
    async read(collection, query) {
        const service = this.getService(collection);
        const result = this.schema.collections[collection].singleton
            ? await service.readSingleton(query, { stripNonRequested: false })
            : await service.readByQuery(query, { stripNonRequested: false });
        return result;
    }
    /**
     * Upsert and read singleton item
     */
    async upsertSingleton(collection, body, query) {
        const service = this.getService(collection);
        try {
            await service.upsertSingleton(body);
            if ((query.fields || []).length > 0) {
                const result = await service.readSingleton(query);
                return result;
            }
            return true;
        }
        catch (err) {
            throw this.formatError(err);
        }
    }
    /**
     * GraphQL's regular resolver `args` variable only contains the "top-level" arguments. Seeing that we convert the
     * whole nested tree into one big query using Directus' own query resolver, we want to have a nested structure of
     * arguments for the whole resolving tree, which can later be transformed into Directus' AST using `deep`.
     * In order to do that, we'll parse over all ArgumentNodes and ObjectFieldNodes to manually recreate an object structure
     * of arguments
     */
    parseArgs(args, variableValues) {
        if (!args || args.length === 0)
            return {};
        const parse = (node) => {
            switch (node.kind) {
                case 'Variable':
                    return variableValues[node.name.value];
                case 'ListValue':
                    return node.values.map(parse);
                case 'ObjectValue':
                    return Object.fromEntries(node.fields.map((node) => [node.name.value, parse(node.value)]));
                case 'NullValue':
                    return null;
                case 'StringValue':
                    return String(node.value);
                case 'IntValue':
                case 'FloatValue':
                    return Number(node.value);
                case 'BooleanValue':
                    return Boolean(node.value);
                case 'EnumValue':
                default:
                    return 'value' in node ? node.value : null;
            }
        };
        const argsObject = Object.fromEntries(args.map((arg) => [arg.name.value, parse(arg.value)]));
        return argsObject;
    }
    /**
     * Get a Directus Query object from the parsed arguments (rawQuery) and GraphQL AST selectionSet. Converts SelectionSet into
     * Directus' `fields` query for use in the resolver. Also applies variables where appropriate.
     */
    getQuery(rawQuery, selections, variableValues) {
        const query = (0, sanitize_query_1.sanitizeQuery)(rawQuery, this.accountability);
        const parseAliases = (selections) => {
            var _a;
            const aliases = {};
            for (const selection of selections) {
                if (selection.kind !== 'Field')
                    continue;
                if ((_a = selection.alias) === null || _a === void 0 ? void 0 : _a.value) {
                    aliases[selection.alias.value] = selection.name.value;
                }
            }
            return aliases;
        };
        const parseFields = (selections, parent) => {
            const fields = [];
            for (let selection of selections) {
                if ((selection.kind === 'Field' || selection.kind === 'InlineFragment') !== true)
                    continue;
                selection = selection;
                let current;
                let currentAlias = null;
                // Union type (Many-to-Any)
                if (selection.kind === 'InlineFragment') {
                    if (selection.typeCondition.name.value.startsWith('__'))
                        continue;
                    current = `${parent}:${selection.typeCondition.name.value}`;
                }
                // Any other field type
                else {
                    // filter out graphql pointers, like __typename
                    if (selection.name.value.startsWith('__'))
                        continue;
                    current = selection.name.value;
                    if (selection.alias) {
                        currentAlias = selection.alias.value;
                    }
                    if (parent) {
                        current = `${parent}.${current}`;
                        if (currentAlias) {
                            currentAlias = `${parent}.${currentAlias}`;
                            // add nested aliases into deep query
                            if (selection.selectionSet) {
                                if (!query.deep)
                                    query.deep = {};
                                (0, lodash_1.set)(query.deep, parent, (0, lodash_1.merge)({}, (0, lodash_1.get)(query.deep, parent), { _alias: { [selection.alias.value]: selection.name.value } }));
                            }
                        }
                    }
                }
                if (selection.selectionSet) {
                    let children;
                    if (current.endsWith('_func')) {
                        children = [];
                        const rootField = current.slice(0, -5);
                        for (const subSelection of selection.selectionSet.selections) {
                            if (subSelection.kind !== 'Field')
                                continue;
                            if (subSelection.name.value.startsWith('__'))
                                continue;
                            children.push(`${subSelection.name.value}(${rootField})`);
                        }
                    }
                    else {
                        children = parseFields(selection.selectionSet.selections, currentAlias !== null && currentAlias !== void 0 ? currentAlias : current);
                    }
                    fields.push(...children);
                }
                else {
                    fields.push(current);
                }
                if (selection.kind === 'Field' && selection.arguments && selection.arguments.length > 0) {
                    if (selection.arguments && selection.arguments.length > 0) {
                        if (!query.deep)
                            query.deep = {};
                        const args = this.parseArgs(selection.arguments, variableValues);
                        (0, lodash_1.set)(query.deep, currentAlias !== null && currentAlias !== void 0 ? currentAlias : current, (0, lodash_1.merge)({}, (0, lodash_1.get)(query.deep, currentAlias !== null && currentAlias !== void 0 ? currentAlias : current), (0, lodash_1.mapKeys)((0, sanitize_query_1.sanitizeQuery)(args, this.accountability), (value, key) => `_${key}`)));
                    }
                }
            }
            return (0, lodash_1.uniq)(fields);
        };
        query.alias = parseAliases(selections);
        query.fields = parseFields(selections);
        query.filter = this.replaceFuncs(query.filter);
        query.deep = this.replaceFuncs(query.deep);
        (0, validate_query_1.validateQuery)(query);
        return query;
    }
    /**
     * Resolve the aggregation query based on the requested aggregated fields
     */
    getAggregateQuery(rawQuery, selections) {
        var _a, _b;
        const query = (0, sanitize_query_1.sanitizeQuery)(rawQuery, this.accountability);
        query.aggregate = {};
        for (let aggregationGroup of selections) {
            if ((aggregationGroup.kind === 'Field') !== true)
                continue;
            aggregationGroup = aggregationGroup;
            // filter out graphql pointers, like __typename
            if (aggregationGroup.name.value.startsWith('__'))
                continue;
            const aggregateProperty = aggregationGroup.name.value;
            query.aggregate[aggregateProperty] =
                (_b = (_a = aggregationGroup.selectionSet) === null || _a === void 0 ? void 0 : _a.selections.filter((selectionNode) => !(selectionNode === null || selectionNode === void 0 ? void 0 : selectionNode.name.value.startsWith('__'))).map((selectionNode) => {
                    selectionNode = selectionNode;
                    return selectionNode.name.value;
                })) !== null && _b !== void 0 ? _b : [];
        }
        query.filter = this.replaceFuncs(query.filter);
        (0, validate_query_1.validateQuery)(query);
        return query;
    }
    /**
     * Replace functions from GraphQL format to Directus-Filter format
     */
    replaceFuncs(filter) {
        if (!filter)
            return filter;
        return replaceFuncDeep(filter);
        function replaceFuncDeep(filter) {
            return (0, lodash_1.transform)(filter, (result, value, key) => {
                const isFunctionKey = typeof key === 'string' && key.endsWith('_func') && constants_2.FUNCTIONS.includes(Object.keys(value)[0]);
                if (isFunctionKey) {
                    const functionName = Object.keys(value)[0];
                    const fieldName = key.slice(0, -5);
                    result[`${functionName}(${fieldName})`] = Object.values(value)[0];
                }
                else {
                    result[key] = (value === null || value === void 0 ? void 0 : value.constructor) === Object || (value === null || value === void 0 ? void 0 : value.constructor) === Array ? replaceFuncDeep(value) : value;
                }
            });
        }
    }
    /**
     * Convert Directus-Exception into a GraphQL format, so it can be returned by GraphQL properly.
     */
    formatError(error) {
        if (Array.isArray(error)) {
            error[0].extensions.code = error[0].code;
            return new graphql_1.GraphQLError(error[0].message, undefined, undefined, undefined, undefined, error[0]);
        }
        error.extensions.code = error.code;
        return new graphql_1.GraphQLError(error.message, undefined, undefined, undefined, undefined, error);
    }
    /**
     * Select the correct service for the given collection. This allows the individual services to run
     * their custom checks (f.e. it allows UsersService to prevent updating TFA secret from outside)
     */
    getService(collection) {
        const opts = {
            knex: this.knex,
            accountability: this.accountability,
            schema: this.schema,
        };
        switch (collection) {
            case 'directus_activity':
                return new activity_1.ActivityService(opts);
            case 'directus_files':
                return new files_1.FilesService(opts);
            case 'directus_folders':
                return new folders_1.FoldersService(opts);
            case 'directus_permissions':
                return new permissions_1.PermissionsService(opts);
            case 'directus_presets':
                return new presets_1.PresetsService(opts);
            case 'directus_notifications':
                return new notifications_1.NotificationsService(opts);
            case 'directus_revisions':
                return new revisions_1.RevisionsService(opts);
            case 'directus_roles':
                return new roles_1.RolesService(opts);
            case 'directus_settings':
                return new settings_1.SettingsService(opts);
            case 'directus_users':
                return new users_1.UsersService(opts);
            case 'directus_webhooks':
                return new webhooks_1.WebhooksService(opts);
            case 'directus_shares':
                return new shares_1.SharesService(opts);
            case 'directus_flows':
                return new flows_1.FlowsService(opts);
            case 'directus_operations':
                return new operations_1.OperationsService(opts);
            default:
                return new items_1.ItemsService(collection, opts);
        }
    }
    /**
     * Replace all fragments in a selectionset for the actual selection set as defined in the fragment
     * Effectively merges the selections with the fragments used in those selections
     */
    replaceFragmentsInSelections(selections, fragments) {
        if (!selections)
            return null;
        const result = (0, lodash_1.flatten)(selections.map((selection) => {
            // Fragments can contains fragments themselves. This allows for nested fragments
            if (selection.kind === 'FragmentSpread') {
                return this.replaceFragmentsInSelections(fragments[selection.name.value].selectionSet.selections, fragments);
            }
            // Nested relational fields can also contain fragments
            if ((selection.kind === 'Field' || selection.kind === 'InlineFragment') && selection.selectionSet) {
                selection.selectionSet.selections = this.replaceFragmentsInSelections(selection.selectionSet.selections, fragments);
            }
            return selection;
        })).filter((s) => s);
        return result;
    }
    injectSystemResolvers(schemaComposer, { CreateCollectionTypes, ReadCollectionTypes, UpdateCollectionTypes, DeleteCollectionTypes, }, schema) {
        var _a, _b, _c, _d, _e, _f;
        const AuthTokens = schemaComposer.createObjectTC({
            name: 'auth_tokens',
            fields: {
                access_token: graphql_1.GraphQLString,
                expires: graphql_1.GraphQLInt,
                refresh_token: graphql_1.GraphQLString,
            },
        });
        const AuthMode = new graphql_1.GraphQLEnumType({
            name: 'auth_mode',
            values: {
                json: { value: 'json' },
                cookie: { value: 'cookie' },
            },
        });
        const ServerInfo = schemaComposer.createObjectTC({
            name: 'server_info',
            fields: {
                project_name: { type: graphql_1.GraphQLString },
                project_logo: { type: graphql_1.GraphQLString },
                project_color: { type: graphql_1.GraphQLString },
                project_foreground: { type: graphql_1.GraphQLString },
                project_background: { type: graphql_1.GraphQLString },
                project_note: { type: graphql_1.GraphQLString },
                custom_css: { type: graphql_1.GraphQLString },
            },
        });
        if (((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.admin) === true) {
            ServerInfo.addFields({
                directus: {
                    type: new graphql_1.GraphQLObjectType({
                        name: 'server_info_directus',
                        fields: {
                            version: {
                                type: graphql_1.GraphQLString,
                            },
                        },
                    }),
                },
                node: {
                    type: new graphql_1.GraphQLObjectType({
                        name: 'server_info_node',
                        fields: {
                            version: {
                                type: graphql_1.GraphQLString,
                            },
                            uptime: {
                                type: graphql_1.GraphQLInt,
                            },
                        },
                    }),
                },
                os: {
                    type: new graphql_1.GraphQLObjectType({
                        name: 'server_info_os',
                        fields: {
                            type: {
                                type: graphql_1.GraphQLString,
                            },
                            version: {
                                type: graphql_1.GraphQLString,
                            },
                            uptime: {
                                type: graphql_1.GraphQLInt,
                            },
                            totalmem: {
                                type: graphql_1.GraphQLInt,
                            },
                        },
                    }),
                },
            });
        }
        /** Globally available query */
        schemaComposer.Query.addFields({
            extensions: {
                type: schemaComposer.createObjectTC({
                    name: 'extensions',
                    fields: {
                        interfaces: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                        displays: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                        layouts: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                        modules: new graphql_1.GraphQLList(graphql_1.GraphQLString),
                    },
                }),
                resolve: async () => {
                    const extensionManager = (0, extensions_1.getExtensionManager)();
                    return {
                        interfaces: extensionManager.getExtensionsList('interface'),
                        displays: extensionManager.getExtensionsList('display'),
                        layouts: extensionManager.getExtensionsList('layout'),
                        modules: extensionManager.getExtensionsList('module'),
                    };
                },
            },
            server_specs_oas: {
                type: graphql_compose_1.GraphQLJSON,
                resolve: async () => {
                    const service = new specifications_1.SpecificationService({ schema: this.schema, accountability: this.accountability });
                    return await service.oas.generate();
                },
            },
            server_specs_graphql: {
                type: graphql_1.GraphQLString,
                args: {
                    scope: new graphql_1.GraphQLEnumType({
                        name: 'graphql_sdl_scope',
                        values: {
                            items: { value: 'items' },
                            system: { value: 'system' },
                        },
                    }),
                },
                resolve: async (_, args) => {
                    var _a;
                    const service = new GraphQLService({
                        schema: this.schema,
                        accountability: this.accountability,
                        scope: (_a = args.scope) !== null && _a !== void 0 ? _a : 'items',
                    });
                    return service.getSchema('sdl');
                },
            },
            server_ping: {
                type: graphql_1.GraphQLString,
                resolve: () => 'pong',
            },
            server_info: {
                type: ServerInfo,
                resolve: async () => {
                    const service = new server_1.ServerService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    return await service.serverInfo();
                },
            },
            server_health: {
                type: graphql_compose_1.GraphQLJSON,
                resolve: async () => {
                    const service = new server_1.ServerService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    return await service.health();
                },
            },
        });
        const Collection = schemaComposer.createObjectTC({
            name: 'directus_collections',
        });
        const Field = schemaComposer.createObjectTC({
            name: 'directus_fields',
        });
        const Relation = schemaComposer.createObjectTC({
            name: 'directus_relations',
        });
        /**
         * Globally available mutations
         */
        schemaComposer.Mutation.addFields({
            auth_login: {
                type: AuthTokens,
                args: {
                    email: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    password: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    mode: AuthMode,
                    otp: graphql_1.GraphQLString,
                },
                resolve: async (_, args, { req, res }) => {
                    var _a;
                    const accountability = {
                        ip: req === null || req === void 0 ? void 0 : req.ip,
                        userAgent: req === null || req === void 0 ? void 0 : req.get('user-agent'),
                        origin: req === null || req === void 0 ? void 0 : req.get('origin'),
                        role: null,
                    };
                    const authenticationService = new authentication_1.AuthenticationService({
                        accountability: accountability,
                        schema: this.schema,
                    });
                    const result = await authenticationService.login(constants_1.DEFAULT_AUTH_PROVIDER, args, args === null || args === void 0 ? void 0 : args.otp);
                    if (args.mode === 'cookie') {
                        res === null || res === void 0 ? void 0 : res.cookie(env_1.default.REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, {
                            httpOnly: true,
                            domain: env_1.default.REFRESH_TOKEN_COOKIE_DOMAIN,
                            maxAge: (0, get_milliseconds_1.getMilliseconds)(env_1.default.REFRESH_TOKEN_TTL),
                            secure: (_a = env_1.default.REFRESH_TOKEN_COOKIE_SECURE) !== null && _a !== void 0 ? _a : false,
                            sameSite: env_1.default.REFRESH_TOKEN_COOKIE_SAME_SITE || 'strict',
                        });
                    }
                    return {
                        access_token: result.accessToken,
                        expires: result.expires,
                        refresh_token: result.refreshToken,
                    };
                },
            },
            auth_refresh: {
                type: AuthTokens,
                args: {
                    refresh_token: graphql_1.GraphQLString,
                    mode: AuthMode,
                },
                resolve: async (_, args, { req, res }) => {
                    var _a;
                    const accountability = {
                        ip: req === null || req === void 0 ? void 0 : req.ip,
                        userAgent: req === null || req === void 0 ? void 0 : req.get('user-agent'),
                        origin: req === null || req === void 0 ? void 0 : req.get('origin'),
                        role: null,
                    };
                    const authenticationService = new authentication_1.AuthenticationService({
                        accountability: accountability,
                        schema: this.schema,
                    });
                    const currentRefreshToken = args.refresh_token || (req === null || req === void 0 ? void 0 : req.cookies[env_1.default.REFRESH_TOKEN_COOKIE_NAME]);
                    if (!currentRefreshToken) {
                        throw new exceptions_1.InvalidPayloadException(`"refresh_token" is required in either the JSON payload or Cookie`);
                    }
                    const result = await authenticationService.refresh(currentRefreshToken);
                    if (args.mode === 'cookie') {
                        res === null || res === void 0 ? void 0 : res.cookie(env_1.default.REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, {
                            httpOnly: true,
                            domain: env_1.default.REFRESH_TOKEN_COOKIE_DOMAIN,
                            maxAge: (0, get_milliseconds_1.getMilliseconds)(env_1.default.REFRESH_TOKEN_TTL),
                            secure: (_a = env_1.default.REFRESH_TOKEN_COOKIE_SECURE) !== null && _a !== void 0 ? _a : false,
                            sameSite: env_1.default.REFRESH_TOKEN_COOKIE_SAME_SITE || 'strict',
                        });
                    }
                    return {
                        access_token: result.accessToken,
                        expires: result.expires,
                        refresh_token: result.refreshToken,
                    };
                },
            },
            auth_logout: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    refresh_token: graphql_1.GraphQLString,
                },
                resolve: async (_, args, { req }) => {
                    const accountability = {
                        ip: req === null || req === void 0 ? void 0 : req.ip,
                        userAgent: req === null || req === void 0 ? void 0 : req.get('user-agent'),
                        origin: req === null || req === void 0 ? void 0 : req.get('origin'),
                        role: null,
                    };
                    const authenticationService = new authentication_1.AuthenticationService({
                        accountability: accountability,
                        schema: this.schema,
                    });
                    const currentRefreshToken = args.refresh_token || (req === null || req === void 0 ? void 0 : req.cookies[env_1.default.REFRESH_TOKEN_COOKIE_NAME]);
                    if (!currentRefreshToken) {
                        throw new exceptions_1.InvalidPayloadException(`"refresh_token" is required in either the JSON payload or Cookie`);
                    }
                    await authenticationService.logout(currentRefreshToken);
                    return true;
                },
            },
            auth_password_request: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    email: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    reset_url: graphql_1.GraphQLString,
                },
                resolve: async (_, args, { req }) => {
                    const accountability = {
                        ip: req === null || req === void 0 ? void 0 : req.ip,
                        userAgent: req === null || req === void 0 ? void 0 : req.get('user-agent'),
                        origin: req === null || req === void 0 ? void 0 : req.get('origin'),
                        role: null,
                    };
                    const service = new users_1.UsersService({ accountability, schema: this.schema });
                    try {
                        await service.requestPasswordReset(args.email, args.reset_url || null);
                    }
                    catch (err) {
                        if (err instanceof exceptions_1.InvalidPayloadException) {
                            throw err;
                        }
                    }
                    return true;
                },
            },
            auth_password_reset: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    token: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    password: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                },
                resolve: async (_, args, { req }) => {
                    const accountability = {
                        ip: req === null || req === void 0 ? void 0 : req.ip,
                        userAgent: req === null || req === void 0 ? void 0 : req.get('user-agent'),
                        origin: req === null || req === void 0 ? void 0 : req.get('origin'),
                        role: null,
                    };
                    const service = new users_1.UsersService({ accountability, schema: this.schema });
                    await service.resetPassword(args.token, args.password);
                    return true;
                },
            },
            users_me_tfa_generate: {
                type: new graphql_1.GraphQLObjectType({
                    name: 'users_me_tfa_generate_data',
                    fields: {
                        secret: { type: graphql_1.GraphQLString },
                        otpauth_url: { type: graphql_1.GraphQLString },
                    },
                }),
                args: {
                    password: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                },
                resolve: async (_, args) => {
                    var _a;
                    if (!((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.user))
                        return null;
                    const service = new tfa_1.TFAService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    const authService = new authentication_1.AuthenticationService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    await authService.verifyPassword(this.accountability.user, args.password);
                    const { url, secret } = await service.generateTFA(this.accountability.user);
                    return { secret, otpauth_url: url };
                },
            },
            users_me_tfa_enable: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    otp: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    secret: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                },
                resolve: async (_, args) => {
                    var _a;
                    if (!((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.user))
                        return null;
                    const service = new tfa_1.TFAService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    await service.enableTFA(this.accountability.user, args.otp, args.secret);
                    return true;
                },
            },
            users_me_tfa_disable: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    otp: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                },
                resolve: async (_, args) => {
                    var _a;
                    if (!((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.user))
                        return null;
                    const service = new tfa_1.TFAService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    const otpValid = await service.verifyOTP(this.accountability.user, args.otp);
                    if (otpValid === false) {
                        throw new exceptions_1.InvalidPayloadException(`"otp" is invalid`);
                    }
                    await service.disableTFA(this.accountability.user);
                    return true;
                },
            },
            utils_hash_generate: {
                type: graphql_1.GraphQLString,
                args: {
                    string: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                },
                resolve: async (_, args) => {
                    return await (0, generate_hash_1.generateHash)(args.string);
                },
            },
            utils_hash_verify: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    string: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    hash: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                },
                resolve: async (_, args) => {
                    return await argon2_1.default.verify(args.hash, args.string);
                },
            },
            utils_sort: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    item: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                    to: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                },
                resolve: async (_, args) => {
                    const service = new utils_2.UtilsService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    const { item, to } = args;
                    await service.sort(args.collection, { item, to });
                    return true;
                },
            },
            utils_revert: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    revision: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                },
                resolve: async (_, args) => {
                    const service = new revisions_1.RevisionsService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    await service.revert(args.revision);
                    return true;
                },
            },
            utils_cache_clear: {
                type: void_1.GraphQLVoid,
                resolve: async () => {
                    var _a;
                    if (((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.admin) !== true) {
                        throw new exceptions_1.ForbiddenException();
                    }
                    const { cache } = (0, cache_1.getCache)();
                    await (cache === null || cache === void 0 ? void 0 : cache.clear());
                    await (0, cache_1.clearSystemCache)();
                    return;
                },
            },
            users_invite_accept: {
                type: graphql_1.GraphQLBoolean,
                args: {
                    token: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    password: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                },
                resolve: async (_, args) => {
                    const service = new users_1.UsersService({
                        accountability: this.accountability,
                        schema: this.schema,
                    });
                    await service.acceptInvite(args.token, args.password);
                    return true;
                },
            },
        });
        if ('directus_collections' in schema.read.collections) {
            Collection.addFields({
                collection: graphql_1.GraphQLString,
                meta: schemaComposer.createObjectTC({
                    name: 'directus_collections_meta',
                    fields: Object.values(schema.read.collections['directus_collections'].fields).reduce((acc, field) => {
                        acc[field.field] = {
                            type: field.nullable
                                ? (0, get_graphql_type_1.getGraphQLType)(field.type, field.special)
                                : new graphql_1.GraphQLNonNull((0, get_graphql_type_1.getGraphQLType)(field.type, field.special)),
                            description: field.note,
                        };
                        return acc;
                    }, {}),
                }),
                schema: schemaComposer.createObjectTC({
                    name: 'directus_collections_schema',
                    fields: {
                        name: graphql_1.GraphQLString,
                        comment: graphql_1.GraphQLString,
                    },
                }),
            });
            schemaComposer.Query.addFields({
                collections: {
                    type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(Collection.getType()))),
                    resolve: async () => {
                        const collectionsService = new collections_1.CollectionsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await collectionsService.readByQuery();
                    },
                },
                collections_by_name: {
                    type: Collection,
                    args: {
                        name: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const collectionsService = new collections_1.CollectionsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await collectionsService.readOne(args.name);
                    },
                },
            });
        }
        if ('directus_fields' in schema.read.collections) {
            Field.addFields({
                collection: graphql_1.GraphQLString,
                field: graphql_1.GraphQLString,
                type: graphql_1.GraphQLString,
                meta: schemaComposer.createObjectTC({
                    name: 'directus_fields_meta',
                    fields: Object.values(schema.read.collections['directus_fields'].fields).reduce((acc, field) => {
                        acc[field.field] = {
                            type: field.nullable
                                ? (0, get_graphql_type_1.getGraphQLType)(field.type, field.special)
                                : new graphql_1.GraphQLNonNull((0, get_graphql_type_1.getGraphQLType)(field.type, field.special)),
                            description: field.note,
                        };
                        return acc;
                    }, {}),
                }),
                schema: schemaComposer.createObjectTC({
                    name: 'directus_fields_schema',
                    fields: {
                        name: graphql_1.GraphQLString,
                        table: graphql_1.GraphQLString,
                        data_type: graphql_1.GraphQLString,
                        default_value: graphql_1.GraphQLString,
                        max_length: graphql_1.GraphQLInt,
                        numeric_precision: graphql_1.GraphQLInt,
                        numeric_scale: graphql_1.GraphQLInt,
                        is_nullable: graphql_1.GraphQLBoolean,
                        is_unique: graphql_1.GraphQLBoolean,
                        is_primary_key: graphql_1.GraphQLBoolean,
                        has_auto_increment: graphql_1.GraphQLBoolean,
                        foreign_key_column: graphql_1.GraphQLString,
                        foreign_key_table: graphql_1.GraphQLString,
                        comment: graphql_1.GraphQLString,
                    },
                }),
            });
            schemaComposer.Query.addFields({
                fields: {
                    type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(Field.getType()))),
                    resolve: async () => {
                        const service = new fields_1.FieldsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await service.readAll();
                    },
                },
                fields_in_collection: {
                    type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(Field.getType()))),
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const service = new fields_1.FieldsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await service.readAll(args.collection);
                    },
                },
                fields_by_name: {
                    type: Field,
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        field: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const service = new fields_1.FieldsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await service.readOne(args.collection, args.field);
                    },
                },
            });
        }
        if ('directus_relations' in schema.read.collections) {
            Relation.addFields({
                collection: graphql_1.GraphQLString,
                field: graphql_1.GraphQLString,
                related_collection: graphql_1.GraphQLString,
                schema: schemaComposer.createObjectTC({
                    name: 'directus_relations_schema',
                    fields: {
                        table: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        column: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        foreign_key_table: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        foreign_key_column: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        constraint_name: graphql_1.GraphQLString,
                        on_update: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        on_delete: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                }),
                meta: schemaComposer.createObjectTC({
                    name: 'directus_relations_meta',
                    fields: Object.values(schema.read.collections['directus_relations'].fields).reduce((acc, field) => {
                        acc[field.field] = {
                            type: (0, get_graphql_type_1.getGraphQLType)(field.type, field.special),
                            description: field.note,
                        };
                        return acc;
                    }, {}),
                }),
            });
            schemaComposer.Query.addFields({
                relations: {
                    type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(Relation.getType()))),
                    resolve: async () => {
                        const service = new relations_1.RelationsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await service.readAll();
                    },
                },
                relations_in_collection: {
                    type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(Relation.getType()))),
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const service = new relations_1.RelationsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await service.readAll(args.collection);
                    },
                },
                relations_by_name: {
                    type: Relation,
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        field: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const service = new relations_1.RelationsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        return await service.readOne(args.collection, args.field);
                    },
                },
            });
        }
        if (((_b = this.accountability) === null || _b === void 0 ? void 0 : _b.admin) === true) {
            schemaComposer.Mutation.addFields({
                create_collections_item: {
                    type: Collection,
                    args: {
                        data: (0, graphql_compose_1.toInputObjectType)(Collection.clone('create_directus_collections'), {
                            postfix: '_input',
                        }).addFields({
                            fields: [
                                (0, graphql_compose_1.toInputObjectType)(Field.clone('create_directus_collections_fields'), { postfix: '_input' }).NonNull,
                            ],
                        }).NonNull,
                    },
                    resolve: async (_, args) => {
                        const collectionsService = new collections_1.CollectionsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        const collectionKey = await collectionsService.createOne(args.data);
                        return await collectionsService.readOne(collectionKey);
                    },
                },
                update_collections_item: {
                    type: Collection,
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        data: (0, graphql_compose_1.toInputObjectType)(Collection.clone('update_directus_collections'), {
                            postfix: '_input',
                        }).removeField(['collection', 'schema']).NonNull,
                    },
                    resolve: async (_, args) => {
                        const collectionsService = new collections_1.CollectionsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        const collectionKey = await collectionsService.updateOne(args.collection, args.data);
                        return await collectionsService.readOne(collectionKey);
                    },
                },
                delete_collections_item: {
                    type: schemaComposer.createObjectTC({
                        name: 'delete_collection',
                        fields: {
                            collection: graphql_1.GraphQLString,
                        },
                    }),
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const collectionsService = new collections_1.CollectionsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await collectionsService.deleteOne(args.collection);
                        return { collection: args.collection };
                    },
                },
            });
            schemaComposer.Mutation.addFields({
                create_fields_item: {
                    type: Field,
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        data: (0, graphql_compose_1.toInputObjectType)(Field.clone('create_directus_fields'), { postfix: '_input' }).NonNull,
                    },
                    resolve: async (_, args) => {
                        const service = new fields_1.FieldsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await service.createField(args.collection, args.data);
                        return await service.readOne(args.collection, args.data.field);
                    },
                },
                update_fields_item: {
                    type: Field,
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        field: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        data: (0, graphql_compose_1.toInputObjectType)(Field.clone('update_directus_fields'), { postfix: '_input' }).NonNull,
                    },
                    resolve: async (_, args) => {
                        const service = new fields_1.FieldsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await service.updateField(args.collection, {
                            ...args.data,
                            field: args.field,
                        });
                        return await service.readOne(args.collection, args.data.field);
                    },
                },
                delete_fields_item: {
                    type: schemaComposer.createObjectTC({
                        name: 'delete_field',
                        fields: {
                            collection: graphql_1.GraphQLString,
                            field: graphql_1.GraphQLString,
                        },
                    }),
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        field: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const service = new fields_1.FieldsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await service.deleteField(args.collection, args.field);
                        const { collection, field } = args;
                        return { collection, field };
                    },
                },
            });
            schemaComposer.Mutation.addFields({
                create_relations_item: {
                    type: Relation,
                    args: {
                        data: (0, graphql_compose_1.toInputObjectType)(Relation.clone('create_directus_relations'), { postfix: '_input' }).NonNull,
                    },
                    resolve: async (_, args) => {
                        const relationsService = new relations_1.RelationsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await relationsService.createOne(args.data);
                        return await relationsService.readOne(args.data.collection, args.data.field);
                    },
                },
                update_relations_item: {
                    type: Relation,
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        field: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        data: (0, graphql_compose_1.toInputObjectType)(Relation.clone('update_directus_relations'), { postfix: '_input' }).NonNull,
                    },
                    resolve: async (_, args) => {
                        const relationsService = new relations_1.RelationsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await relationsService.updateOne(args.collection, args.field, args.data);
                        return await relationsService.readOne(args.data.collection, args.data.field);
                    },
                },
                delete_relations_item: {
                    type: schemaComposer.createObjectTC({
                        name: 'delete_relation',
                        fields: {
                            collection: graphql_1.GraphQLString,
                            field: graphql_1.GraphQLString,
                        },
                    }),
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        field: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args) => {
                        const relationsService = new relations_1.RelationsService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await relationsService.deleteOne(args.collection, args.field);
                        return { collection: args.collection, field: args.field };
                    },
                },
            });
        }
        if ('directus_users' in schema.read.collections) {
            schemaComposer.Query.addFields({
                users_me: {
                    type: ReadCollectionTypes['directus_users'],
                    resolve: async (_, args, __, info) => {
                        var _a, _b, _c;
                        if (!((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.user))
                            return null;
                        const service = new users_1.UsersService({ schema: this.schema, accountability: this.accountability });
                        const selections = this.replaceFragmentsInSelections((_c = (_b = info.fieldNodes[0]) === null || _b === void 0 ? void 0 : _b.selectionSet) === null || _c === void 0 ? void 0 : _c.selections, info.fragments);
                        const query = this.getQuery(args, selections || [], info.variableValues);
                        return await service.readOne(this.accountability.user, query);
                    },
                },
            });
        }
        if ('directus_users' in schema.update.collections && ((_c = this.accountability) === null || _c === void 0 ? void 0 : _c.user)) {
            schemaComposer.Mutation.addFields({
                update_users_me: {
                    type: ReadCollectionTypes['directus_users'],
                    args: {
                        data: (0, graphql_compose_1.toInputObjectType)(UpdateCollectionTypes['directus_users']),
                    },
                    resolve: async (_, args, __, info) => {
                        var _a, _b, _c;
                        if (!((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.user))
                            return null;
                        const service = new users_1.UsersService({
                            schema: this.schema,
                            accountability: this.accountability,
                        });
                        await service.updateOne(this.accountability.user, args.data);
                        if ('directus_users' in ReadCollectionTypes) {
                            const selections = this.replaceFragmentsInSelections((_c = (_b = info.fieldNodes[0]) === null || _b === void 0 ? void 0 : _b.selectionSet) === null || _c === void 0 ? void 0 : _c.selections, info.fragments);
                            const query = this.getQuery(args, selections || [], info.variableValues);
                            return await service.readOne(this.accountability.user, query);
                        }
                        return true;
                    },
                },
            });
        }
        if ('directus_activity' in schema.create.collections) {
            schemaComposer.Mutation.addFields({
                create_comment: {
                    type: (_d = ReadCollectionTypes['directus_activity']) !== null && _d !== void 0 ? _d : graphql_1.GraphQLBoolean,
                    args: {
                        collection: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        item: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                        comment: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args, __, info) => {
                        var _a, _b, _c, _d, _e, _f;
                        const service = new activity_1.ActivityService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        const primaryKey = await service.createOne({
                            ...args,
                            action: types_1.Action.COMMENT,
                            user: (_a = this.accountability) === null || _a === void 0 ? void 0 : _a.user,
                            ip: (_b = this.accountability) === null || _b === void 0 ? void 0 : _b.ip,
                            user_agent: (_c = this.accountability) === null || _c === void 0 ? void 0 : _c.userAgent,
                            origin: (_d = this.accountability) === null || _d === void 0 ? void 0 : _d.origin,
                        });
                        if ('directus_activity' in ReadCollectionTypes) {
                            const selections = this.replaceFragmentsInSelections((_f = (_e = info.fieldNodes[0]) === null || _e === void 0 ? void 0 : _e.selectionSet) === null || _f === void 0 ? void 0 : _f.selections, info.fragments);
                            const query = this.getQuery(args, selections || [], info.variableValues);
                            return await service.readOne(primaryKey, query);
                        }
                        return true;
                    },
                },
            });
        }
        if ('directus_activity' in schema.update.collections) {
            schemaComposer.Mutation.addFields({
                update_comment: {
                    type: (_e = ReadCollectionTypes['directus_activity']) !== null && _e !== void 0 ? _e : graphql_1.GraphQLBoolean,
                    args: {
                        id: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                        comment: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                    },
                    resolve: async (_, args, __, info) => {
                        var _a, _b;
                        const service = new activity_1.ActivityService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        const primaryKey = await service.updateOne(args.id, { comment: args.comment });
                        if ('directus_activity' in ReadCollectionTypes) {
                            const selections = this.replaceFragmentsInSelections((_b = (_a = info.fieldNodes[0]) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections, info.fragments);
                            const query = this.getQuery(args, selections || [], info.variableValues);
                            return await service.readOne(primaryKey, query);
                        }
                        return true;
                    },
                },
            });
        }
        if ('directus_activity' in schema.delete.collections) {
            schemaComposer.Mutation.addFields({
                delete_comment: {
                    type: DeleteCollectionTypes.one,
                    args: {
                        id: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
                    },
                    resolve: async (_, args) => {
                        const service = new activity_1.ActivityService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await service.deleteOne(args.id);
                        return { id: args.id };
                    },
                },
            });
        }
        if ('directus_files' in schema.create.collections) {
            schemaComposer.Mutation.addFields({
                import_file: {
                    type: (_f = ReadCollectionTypes['directus_files']) !== null && _f !== void 0 ? _f : graphql_1.GraphQLBoolean,
                    args: {
                        url: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        data: (0, graphql_compose_1.toInputObjectType)(CreateCollectionTypes['directus_files']).setTypeName('create_directus_files_input'),
                    },
                    resolve: async (_, args, __, info) => {
                        var _a, _b;
                        const service = new files_1.FilesService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        const primaryKey = await service.importOne(args.url, args.data);
                        if ('directus_files' in ReadCollectionTypes) {
                            const selections = this.replaceFragmentsInSelections((_b = (_a = info.fieldNodes[0]) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections, info.fragments);
                            const query = this.getQuery(args, selections || [], info.variableValues);
                            return await service.readOne(primaryKey, query);
                        }
                        return true;
                    },
                },
            });
        }
        if ('directus_users' in schema.create.collections) {
            schemaComposer.Mutation.addFields({
                users_invite: {
                    type: graphql_1.GraphQLBoolean,
                    args: {
                        email: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        role: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
                        invite_url: graphql_1.GraphQLString,
                    },
                    resolve: async (_, args) => {
                        const service = new users_1.UsersService({
                            accountability: this.accountability,
                            schema: this.schema,
                        });
                        await service.inviteUser(args.email, args.role, args.invite_url || null);
                        return true;
                    },
                },
            });
        }
        return schemaComposer;
    }
}
exports.GraphQLService = GraphQLService;
