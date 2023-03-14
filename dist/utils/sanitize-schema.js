"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRelation = exports.sanitizeField = exports.sanitizeCollection = void 0;
const lodash_1 = require("lodash");
/**
 * Pick certain database vendor specific collection properties that should be compared when performing diff
 *
 * @param collection collection to sanitize
 * @returns sanitized collection
 *
 * @see {@link https://github.com/knex/knex-schema-inspector/blob/master/lib/types/table.ts}
 */
function sanitizeCollection(collection) {
    if (!collection)
        return collection;
    return (0, lodash_1.pick)(collection, ['collection', 'fields', 'meta', 'schema.name']);
}
exports.sanitizeCollection = sanitizeCollection;
/**
 * Pick certain database vendor specific field properties that should be compared when performing diff
 *
 * @param field field to sanitize
 * @param sanitizeAllSchema Whether or not the whole field schema should be sanitized. Mainly used to prevent modifying autoincrement fields
 * @returns sanitized field
 *
 * @see {@link https://github.com/knex/knex-schema-inspector/blob/master/lib/types/column.ts}
 */
function sanitizeField(field, sanitizeAllSchema = false) {
    if (!field)
        return field;
    const defaultPaths = ['collection', 'field', 'type', 'meta', 'name', 'children'];
    const pickedPaths = sanitizeAllSchema
        ? defaultPaths
        : [
            ...defaultPaths,
            'schema.name',
            'schema.table',
            'schema.data_type',
            'schema.default_value',
            'schema.max_length',
            'schema.numeric_precision',
            'schema.numeric_scale',
            'schema.is_nullable',
            'schema.is_unique',
            'schema.is_primary_key',
            'schema.is_generated',
            'schema.generation_expression',
            'schema.has_auto_increment',
            'schema.foreign_key_table',
            'schema.foreign_key_column',
        ];
    return (0, lodash_1.pick)(field, pickedPaths);
}
exports.sanitizeField = sanitizeField;
/**
 * Pick certain database vendor specific relation properties that should be compared when performing diff
 *
 * @param relation relation to sanitize
 * @returns sanitized relation
 *
 * @see {@link https://github.com/knex/knex-schema-inspector/blob/master/lib/types/foreign-key.ts}
 */
function sanitizeRelation(relation) {
    if (!relation)
        return relation;
    return (0, lodash_1.pick)(relation, [
        'collection',
        'field',
        'related_collection',
        'meta',
        'schema.table',
        'schema.column',
        'schema.foreign_key_table',
        'schema.foreign_key_column',
        'schema.constraint_name',
        'schema.on_update',
        'schema.on_delete',
    ]);
}
exports.sanitizeRelation = sanitizeRelation;
