"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaHelperMySQL = void 0;
const database_1 = require("../../../../database");
const types_1 = require("../types");
class SchemaHelperMySQL extends types_1.SchemaHelper {
    applyMultiRelationalSort(knex, dbQuery, table, primaryKey, orderByString, orderByFields) {
        var _a;
        if ((_a = (0, database_1.getDatabaseVersion)()) === null || _a === void 0 ? void 0 : _a.startsWith('5.7')) {
            dbQuery.orderByRaw(`?? asc, ${orderByString}`, [`${table}.${primaryKey}`, ...orderByFields]);
            dbQuery = knex
                .select(knex.raw(`??, ( @rank := IF ( @cur_id = deep.${primaryKey}, @rank + 1, 1 ) ) AS directus_row_number, ( @cur_id := deep.${primaryKey} ) AS current_id`, 'deep.*'))
                .from(knex.raw('? as ??, (SELECT @rank := 0,  @cur_id := null) vars', [dbQuery, 'deep']));
            return dbQuery;
        }
        return super.applyMultiRelationalSort(knex, dbQuery, table, primaryKey, orderByString, orderByFields);
    }
}
exports.SchemaHelperMySQL = SchemaHelperMySQL;
