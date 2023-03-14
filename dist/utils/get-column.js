"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getColumn = void 0;
const constants_1 = require("@directus/shared/constants");
const utils_1 = require("@directus/shared/utils");
const helpers_1 = require("../database/helpers");
const exceptions_1 = require("../exceptions");
const apply_function_to_column_name_1 = require("./apply-function-to-column-name");
/**
 * Return column prefixed by table. If column includes functions (like `year(date_created)`), the
 * column is replaced with the appropriate SQL
 *
 * @param knex Current knex / transaction instance
 * @param table Collection or alias in which column resides
 * @param column name of the column
 * @param alias Whether or not to add a SQL AS statement
 * @param schema For retrieval of the column type
 * @param options Optional parameters
 * @returns Knex raw instance
 */
function getColumn(knex, table, column, alias = (0, apply_function_to_column_name_1.applyFunctionToColumnName)(column), schema, options) {
    var _a, _b, _c, _d;
    const fn = (0, helpers_1.getFunctions)(knex, schema);
    if (column.includes('(') && column.includes(')')) {
        const functionName = column.split('(')[0];
        const columnName = column.match(constants_1.REGEX_BETWEEN_PARENS)[1];
        if (functionName in fn) {
            const collectionName = (options === null || options === void 0 ? void 0 : options.originalCollectionName) || table;
            const type = (_d = (_c = (_b = (_a = schema === null || schema === void 0 ? void 0 : schema.collections[collectionName]) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b[columnName]) === null || _c === void 0 ? void 0 : _c.type) !== null && _d !== void 0 ? _d : 'unknown';
            const allowedFunctions = (0, utils_1.getFunctionsForType)(type);
            if (allowedFunctions.includes(functionName) === false) {
                throw new exceptions_1.InvalidQueryException(`Invalid function specified "${functionName}"`);
            }
            const result = fn[functionName](table, columnName, {
                type,
                query: options === null || options === void 0 ? void 0 : options.query,
                originalCollectionName: options === null || options === void 0 ? void 0 : options.originalCollectionName,
            });
            if (alias) {
                return knex.raw(result + ' AS ??', [alias]);
            }
            return result;
        }
        else {
            throw new exceptions_1.InvalidQueryException(`Invalid function specified "${functionName}"`);
        }
    }
    if (alias && column !== alias) {
        return knex.ref(`${table}.${column}`).as(alias);
    }
    return knex.ref(`${table}.${column}`);
}
exports.getColumn = getColumn;
