"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = void 0;
const joi_1 = __importDefault(require("joi"));
const lodash_1 = require("lodash");
const exceptions_1 = require("../exceptions");
const wellknown_1 = require("wellknown");
const calculate_field_depth_1 = require("./calculate-field-depth");
const env_1 = __importDefault(require("../env"));
const querySchema = joi_1.default.object({
    fields: joi_1.default.array().items(joi_1.default.string()),
    group: joi_1.default.array().items(joi_1.default.string()),
    sort: joi_1.default.array().items(joi_1.default.string()),
    filter: joi_1.default.object({}).unknown(),
    limit: joi_1.default.number().integer().min(-1),
    offset: joi_1.default.number().integer().min(0),
    page: joi_1.default.number().integer().min(0),
    meta: joi_1.default.array().items(joi_1.default.string().valid('total_count', 'filter_count')),
    search: joi_1.default.string(),
    export: joi_1.default.string().valid('csv', 'json', 'xml', 'yaml'),
    aggregate: joi_1.default.object(),
    deep: joi_1.default.object(),
    alias: joi_1.default.object(),
}).id('query');
function validateQuery(query) {
    const { error } = querySchema.validate(query);
    if (query.filter && Object.keys(query.filter).length > 0) {
        validateFilter(query.filter);
    }
    if (query.alias) {
        validateAlias(query.alias);
    }
    validateRelationalDepth(query);
    if (error) {
        throw new exceptions_1.InvalidQueryException(error.message);
    }
    return query;
}
exports.validateQuery = validateQuery;
function validateFilter(filter) {
    if (!filter)
        throw new exceptions_1.InvalidQueryException('Invalid filter object');
    for (const [key, nested] of Object.entries(filter)) {
        if (key === '_and' || key === '_or') {
            nested.forEach(validateFilter);
        }
        else if (key.startsWith('_')) {
            const value = nested;
            switch (key) {
                case '_in':
                case '_nin':
                case '_between':
                case '_nbetween':
                    validateList(value, key);
                    break;
                case '_null':
                case '_nnull':
                case '_empty':
                case '_nempty':
                    validateBoolean(value, key);
                    break;
                case '_intersects':
                case '_nintersects':
                case '_intersects_bbox':
                case '_nintersects_bbox':
                    validateGeometry(value, key);
                    break;
                case '_none':
                case '_some':
                    validateFilter(nested);
                    break;
                case '_eq':
                case '_neq':
                case '_contains':
                case '_ncontains':
                case '_starts_with':
                case '_nstarts_with':
                case '_ends_with':
                case '_nends_with':
                case '_gt':
                case '_gte':
                case '_lt':
                case '_lte':
                default:
                    validateFilterPrimitive(value, key);
                    break;
            }
        }
        else if ((0, lodash_1.isPlainObject)(nested)) {
            validateFilter(nested);
        }
        else if (Array.isArray(nested) === false) {
            validateFilterPrimitive(nested, '_eq');
        }
        else {
            validateFilter(nested);
        }
    }
}
function validateFilterPrimitive(value, key) {
    if (value === null)
        return true;
    if ((typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) ===
        false) {
        throw new exceptions_1.InvalidQueryException(`The filter value for "${key}" has to be a string, number, or boolean`);
    }
    if (typeof value === 'number' && (Number.isNaN(value) || value > Number.MAX_SAFE_INTEGER)) {
        throw new exceptions_1.InvalidQueryException(`The filter value for "${key}" is not a valid number`);
    }
    if (typeof value === 'string' && value.length === 0) {
        throw new exceptions_1.InvalidQueryException(`You can't filter for an empty string in "${key}". Use "_empty" or "_nempty" instead`);
    }
    return true;
}
function validateList(value, key) {
    if (Array.isArray(value) === false || value.length === 0) {
        throw new exceptions_1.InvalidQueryException(`"${key}" has to be an array of values`);
    }
    return true;
}
function validateBoolean(value, key) {
    if (value === null)
        return true;
    if (typeof value !== 'boolean') {
        throw new exceptions_1.InvalidQueryException(`"${key}" has to be a boolean`);
    }
    return true;
}
function validateGeometry(value, key) {
    if (value === null)
        return true;
    try {
        (0, wellknown_1.stringify)(value);
    }
    catch {
        throw new exceptions_1.InvalidQueryException(`"${key}" has to be a valid GeoJSON object`);
    }
    return true;
}
function validateAlias(alias) {
    if ((0, lodash_1.isPlainObject)(alias) === false) {
        throw new exceptions_1.InvalidQueryException(`"alias" has to be an object`);
    }
    for (const [key, value] of Object.entries(alias)) {
        if (typeof key !== 'string') {
            throw new exceptions_1.InvalidQueryException(`"alias" key has to be a string. "${typeof key}" given.`);
        }
        if (typeof value !== 'string') {
            throw new exceptions_1.InvalidQueryException(`"alias" value has to be a string. "${typeof key}" given.`);
        }
        if (key.includes('.') || value.includes('.')) {
            throw new exceptions_1.InvalidQueryException(`"alias" key/value can't contain a period character \`.\``);
        }
    }
}
function validateRelationalDepth(query) {
    const maxRelationalDepth = Number(env_1.default.MAX_RELATIONAL_DEPTH) > 2 ? Number(env_1.default.MAX_RELATIONAL_DEPTH) : 2;
    // Process the fields in the same way as api/src/utils/get-ast-from-query.ts
    let fields = ['*'];
    if (query.fields) {
        fields = query.fields;
    }
    /**
     * When using aggregate functions, you can't have any other regular fields
     * selected. This makes sure you never end up in a non-aggregate fields selection error
     */
    if (Object.keys(query.aggregate || {}).length > 0) {
        fields = [];
    }
    /**
     * Similarly, when grouping on a specific field, you can't have other non-aggregated fields.
     * The group query will override the fields query
     */
    if (query.group) {
        fields = query.group;
    }
    fields = (0, lodash_1.uniq)(fields);
    for (const field of fields) {
        if (field.split('.').length > maxRelationalDepth) {
            throw new exceptions_1.InvalidQueryException('Max relational depth exceeded.');
        }
    }
    if (query.filter) {
        const filterRelationalDepth = (0, calculate_field_depth_1.calculateFieldDepth)(query.filter);
        if (filterRelationalDepth > maxRelationalDepth) {
            throw new exceptions_1.InvalidQueryException('Max relational depth exceeded.');
        }
    }
    if (query.sort) {
        for (const sort of query.sort) {
            if (sort.split('.').length > maxRelationalDepth) {
                throw new exceptions_1.InvalidQueryException('Max relational depth exceeded.');
            }
        }
    }
    if (query.deep) {
        const deepRelationalDepth = (0, calculate_field_depth_1.calculateFieldDepth)(query.deep, ['_sort']);
        if (deepRelationalDepth > maxRelationalDepth) {
            throw new exceptions_1.InvalidQueryException('Max relational depth exceeded.');
        }
    }
}
