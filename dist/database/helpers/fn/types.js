"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FnHelper = void 0;
const apply_query_1 = require("../../../utils/apply-query");
const types_1 = require("../types");
class FnHelper extends types_1.DatabaseHelper {
    constructor(knex, schema) {
        super(knex);
        this.knex = knex;
        this.schema = schema;
        this.schema = schema;
    }
    _relationalCount(table, column, options) {
        var _a;
        const collectionName = (options === null || options === void 0 ? void 0 : options.originalCollectionName) || table;
        const relation = this.schema.relations.find((relation) => { var _a; return relation.related_collection === collectionName && ((_a = relation === null || relation === void 0 ? void 0 : relation.meta) === null || _a === void 0 ? void 0 : _a.one_field) === column; });
        const currentPrimary = this.schema.collections[collectionName].primary;
        if (!relation) {
            throw new Error(`Field ${collectionName}.${column} isn't a nested relational collection`);
        }
        let countQuery = this.knex
            .count('*')
            .from(relation.collection)
            .where(relation.field, '=', this.knex.raw(`??.??`, [table, currentPrimary]));
        if ((_a = options === null || options === void 0 ? void 0 : options.query) === null || _a === void 0 ? void 0 : _a.filter) {
            countQuery = (0, apply_query_1.applyFilter)(this.knex, this.schema, countQuery, options.query.filter, relation.collection, {}).query;
        }
        return this.knex.raw('(' + countQuery.toQuery() + ')');
    }
}
exports.FnHelper = FnHelper;
