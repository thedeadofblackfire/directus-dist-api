"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FnHelper = void 0;
const apply_query_1 = require("../../../utils/apply-query");
const types_1 = require("../types");
class FnHelper extends types_1.DatabaseHelper {
    schema;
    constructor(knex, schema) {
        super(knex);
        this.schema = schema;
        this.schema = schema;
    }
    _relationalCount(table, column, options) {
        const collectionName = options?.originalCollectionName || table;
        const relation = this.schema.relations.find((relation) => relation.related_collection === collectionName && relation?.meta?.one_field === column);
        const currentPrimary = this.schema.collections[collectionName].primary;
        if (!relation) {
            throw new Error(`Field ${collectionName}.${column} isn't a nested relational collection`);
        }
        let countQuery = this.knex
            .count('*')
            .from(relation.collection)
            .where(relation.field, '=', this.knex.raw(`??.??`, [table, currentPrimary]));
        if (options?.query?.filter) {
            countQuery = (0, apply_query_1.applyFilter)(this.knex, this.schema, countQuery, options.query.filter, relation.collection, {}).query;
        }
        return this.knex.raw('(' + countQuery.toQuery() + ')');
    }
}
exports.FnHelper = FnHelper;
