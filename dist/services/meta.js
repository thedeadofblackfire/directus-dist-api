"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaService = void 0;
const database_1 = __importDefault(require("../database"));
const exceptions_1 = require("../exceptions");
const apply_query_1 = require("../utils/apply-query");
class MetaService {
    knex;
    accountability;
    schema;
    constructor(options) {
        this.knex = options.knex || (0, database_1.default)();
        this.accountability = options.accountability || null;
        this.schema = options.schema;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getMetaForQuery(collection, query) {
        if (!query || !query.meta)
            return;
        const results = await Promise.all(query.meta.map((metaVal) => {
            if (metaVal === 'total_count')
                return this.totalCount(collection);
            if (metaVal === 'filter_count')
                return this.filterCount(collection, query);
            return undefined;
        }));
        return results.reduce((metaObject, value, index) => {
            return {
                ...metaObject,
                [query.meta[index]]: value,
            };
        }, {});
    }
    async totalCount(collection) {
        const dbQuery = this.knex(collection).count('*', { as: 'count' }).first();
        if (this.accountability?.admin !== true) {
            const permissionsRecord = this.accountability?.permissions?.find((permission) => {
                return permission.action === 'read' && permission.collection === collection;
            });
            if (!permissionsRecord)
                throw new exceptions_1.ForbiddenException();
            const permissions = permissionsRecord.permissions ?? {};
            (0, apply_query_1.applyFilter)(this.knex, this.schema, dbQuery, permissions, collection, {});
        }
        const result = await dbQuery;
        return Number(result?.count ?? 0);
    }
    async filterCount(collection, query) {
        const dbQuery = this.knex(collection).count('*', { as: 'count' });
        let filter = query.filter || {};
        if (this.accountability?.admin !== true) {
            const permissionsRecord = this.accountability?.permissions?.find((permission) => {
                return permission.action === 'read' && permission.collection === collection;
            });
            if (!permissionsRecord)
                throw new exceptions_1.ForbiddenException();
            const permissions = permissionsRecord.permissions ?? {};
            if (Object.keys(filter).length > 0) {
                filter = { _and: [permissions, filter] };
            }
            else {
                filter = permissions;
            }
        }
        if (Object.keys(filter).length > 0) {
            (0, apply_query_1.applyFilter)(this.knex, this.schema, dbQuery, filter, collection, {});
        }
        if (query.search) {
            (0, apply_query_1.applySearch)(this.schema, dbQuery, query.search, collection);
        }
        const records = await dbQuery;
        return Number(records[0].count);
    }
}
exports.MetaService = MetaService;
