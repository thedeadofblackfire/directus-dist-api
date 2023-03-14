"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FnHelperMySQL = void 0;
const types_1 = require("../types");
class FnHelperMySQL extends types_1.FnHelper {
    year(table, column) {
        return this.knex.raw('YEAR(??.??)', [table, column]);
    }
    month(table, column) {
        return this.knex.raw('MONTH(??.??)', [table, column]);
    }
    week(table, column) {
        return this.knex.raw('WEEK(??.??)', [table, column]);
    }
    day(table, column) {
        return this.knex.raw('DAYOFMONTH(??.??)', [table, column]);
    }
    weekday(table, column) {
        return this.knex.raw('DAYOFWEEK(??.??)', [table, column]);
    }
    hour(table, column) {
        return this.knex.raw('HOUR(??.??)', [table, column]);
    }
    minute(table, column) {
        return this.knex.raw('MINUTE(??.??)', [table, column]);
    }
    second(table, column) {
        return this.knex.raw('SECOND(??.??)', [table, column]);
    }
    count(table, column, options) {
        var _a, _b, _c, _d, _e;
        const collectionName = (options === null || options === void 0 ? void 0 : options.originalCollectionName) || table;
        const type = (_e = (_d = (_c = (_b = (_a = this.schema.collections) === null || _a === void 0 ? void 0 : _a[collectionName]) === null || _b === void 0 ? void 0 : _b.fields) === null || _c === void 0 ? void 0 : _c[column]) === null || _d === void 0 ? void 0 : _d.type) !== null && _e !== void 0 ? _e : 'unknown';
        if (type === 'json') {
            return this.knex.raw('JSON_LENGTH(??.??)', [table, column]);
        }
        if (type === 'alias') {
            return this._relationalCount(table, column, options);
        }
        throw new Error(`Couldn't extract type from ${table}.${column}`);
    }
}
exports.FnHelperMySQL = FnHelperMySQL;
