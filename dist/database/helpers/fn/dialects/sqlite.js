"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FnHelperSQLite = void 0;
const types_1 = require("../types");
const parseLocaltime = (columnType) => {
    if (columnType === 'timestamp') {
        return '';
    }
    return `, 'localtime'`;
};
class FnHelperSQLite extends types_1.FnHelper {
    year(table, column, options) {
        return this.knex.raw(`CAST(strftime('%Y', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    month(table, column, options) {
        return this.knex.raw(`CAST(strftime('%m', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    week(table, column, options) {
        return this.knex.raw(`CAST(strftime('%W', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    day(table, column, options) {
        return this.knex.raw(`CAST(strftime('%d', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    weekday(table, column, options) {
        return this.knex.raw(`CAST(strftime('%w', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    hour(table, column, options) {
        return this.knex.raw(`CAST(strftime('%H', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    minute(table, column, options) {
        return this.knex.raw(`CAST(strftime('%M', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    second(table, column, options) {
        return this.knex.raw(`CAST(strftime('%S', ??.?? / 1000, 'unixepoch'${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)}) AS INTEGER)`, [
            table,
            column,
        ]);
    }
    count(table, column, options) {
        var _a, _b, _c, _d, _e;
        const collectionName = (options === null || options === void 0 ? void 0 : options.originalCollectionName) || table;
        const type = (_e = (_d = (_c = (_b = (_a = this.schema.collections) === null || _a === void 0 ? void 0 : _a[collectionName]) === null || _b === void 0 ? void 0 : _b.fields) === null || _c === void 0 ? void 0 : _c[column]) === null || _d === void 0 ? void 0 : _d.type) !== null && _e !== void 0 ? _e : 'unknown';
        if (type === 'json') {
            return this.knex.raw(`json_array_length(??.??, '$')`, [table, column]);
        }
        if (type === 'alias') {
            return this._relationalCount(table, column, options);
        }
        throw new Error(`Couldn't extract type from ${table}.${column}`);
    }
}
exports.FnHelperSQLite = FnHelperSQLite;
