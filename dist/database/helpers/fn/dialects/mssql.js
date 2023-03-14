"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FnHelperMSSQL = void 0;
const types_1 = require("../types");
const parseLocaltime = (columnType) => {
    if (columnType === 'timestamp') {
        return ` AT TIME ZONE 'UTC'`;
    }
    return '';
};
class FnHelperMSSQL extends types_1.FnHelper {
    year(table, column, options) {
        return this.knex.raw(`DATEPART(year, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    month(table, column, options) {
        return this.knex.raw(`DATEPART(month, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    week(table, column, options) {
        return this.knex.raw(`DATEPART(week, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    day(table, column, options) {
        return this.knex.raw(`DATEPART(day, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    weekday(table, column, options) {
        return this.knex.raw(`DATEPART(weekday, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    hour(table, column, options) {
        return this.knex.raw(`DATEPART(hour, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    minute(table, column, options) {
        return this.knex.raw(`DATEPART(minute, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    second(table, column, options) {
        return this.knex.raw(`DATEPART(second, ??.??${parseLocaltime(options === null || options === void 0 ? void 0 : options.type)})`, [table, column]);
    }
    count(table, column, options) {
        var _a, _b, _c, _d, _e;
        const collectionName = (options === null || options === void 0 ? void 0 : options.originalCollectionName) || table;
        const type = (_e = (_d = (_c = (_b = (_a = this.schema.collections) === null || _a === void 0 ? void 0 : _a[collectionName]) === null || _b === void 0 ? void 0 : _b.fields) === null || _c === void 0 ? void 0 : _c[column]) === null || _d === void 0 ? void 0 : _d.type) !== null && _e !== void 0 ? _e : 'unknown';
        if (type === 'json') {
            return this.knex.raw(`(SELECT COUNT(*) FROM OPENJSON(??.??, '$'))`, [table, column]);
        }
        if (type === 'alias') {
            return this._relationalCount(table, column, options);
        }
        throw new Error(`Couldn't extract type from ${table}.${column}`);
    }
}
exports.FnHelperMSSQL = FnHelperMSSQL;
