"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const cache_1 = require("../cache");
const app_access_permissions_1 = require("../database/system-data/app-access-permissions");
const items_1 = require("../services/items");
const filter_items_1 = require("../utils/filter-items");
class PermissionsService extends items_1.ItemsService {
    systemCache;
    constructor(options) {
        super('directus_permissions', options);
        const { systemCache } = (0, cache_1.getCache)();
        this.systemCache = systemCache;
    }
    getAllowedFields(action, collection) {
        const results = this.accountability?.permissions?.filter((permission) => {
            let matchesCollection = true;
            if (collection) {
                matchesCollection = permission.collection === collection;
            }
            const matchesAction = permission.action === action;
            return collection ? matchesCollection && matchesAction : matchesAction;
        }) ?? [];
        const fieldsPerCollection = {};
        for (const result of results) {
            const { collection, fields } = result;
            if (!fieldsPerCollection[collection])
                fieldsPerCollection[collection] = [];
            fieldsPerCollection[collection].push(...(fields ?? []));
        }
        return fieldsPerCollection;
    }
    async readByQuery(query, opts) {
        const result = await super.readByQuery(query, opts);
        if (Array.isArray(result) && this.accountability && this.accountability.app === true) {
            result.push(...(0, filter_items_1.filterItems)(app_access_permissions_1.appAccessMinimalPermissions.map((permission) => ({
                ...permission,
                role: this.accountability.role,
            })), query.filter));
        }
        return result;
    }
    async readMany(keys, query = {}, opts) {
        const result = await super.readMany(keys, query, opts);
        if (this.accountability && this.accountability.app === true) {
            result.push(...(0, filter_items_1.filterItems)(app_access_permissions_1.appAccessMinimalPermissions.map((permission) => ({
                ...permission,
                role: this.accountability.role,
            })), query.filter));
        }
        return result;
    }
    async createOne(data, opts) {
        const res = await super.createOne(data, opts);
        await (0, cache_1.clearSystemCache)({ autoPurgeCache: opts?.autoPurgeCache });
        return res;
    }
    async createMany(data, opts) {
        const res = await super.createMany(data, opts);
        await (0, cache_1.clearSystemCache)({ autoPurgeCache: opts?.autoPurgeCache });
        return res;
    }
    async updateBatch(data, opts) {
        const res = await super.updateBatch(data, opts);
        await (0, cache_1.clearSystemCache)({ autoPurgeCache: opts?.autoPurgeCache });
        return res;
    }
    async updateMany(keys, data, opts) {
        const res = await super.updateMany(keys, data, opts);
        await (0, cache_1.clearSystemCache)({ autoPurgeCache: opts?.autoPurgeCache });
        return res;
    }
    async upsertMany(payloads, opts) {
        const res = await super.upsertMany(payloads, opts);
        await (0, cache_1.clearSystemCache)({ autoPurgeCache: opts?.autoPurgeCache });
        return res;
    }
    async deleteMany(keys, opts) {
        const res = await super.deleteMany(keys, opts);
        await (0, cache_1.clearSystemCache)({ autoPurgeCache: opts?.autoPurgeCache });
        return res;
    }
}
exports.PermissionsService = PermissionsService;
