"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowsService = void 0;
const flows_1 = require("../flows");
const items_1 = require("./items");
class FlowsService extends items_1.ItemsService {
    constructor(options) {
        super('directus_flows', options);
    }
    async createOne(data, opts) {
        const flowManager = (0, flows_1.getFlowManager)();
        const result = await super.createOne(data, opts);
        await flowManager.reload();
        return result;
    }
    async createMany(data, opts) {
        const flowManager = (0, flows_1.getFlowManager)();
        const result = await super.createMany(data, opts);
        await flowManager.reload();
        return result;
    }
    async updateBatch(data, opts) {
        const flowManager = (0, flows_1.getFlowManager)();
        const result = await super.updateBatch(data, opts);
        await flowManager.reload();
        return result;
    }
    async updateMany(keys, data, opts) {
        const flowManager = (0, flows_1.getFlowManager)();
        const result = await super.updateMany(keys, data, opts);
        await flowManager.reload();
        return result;
    }
    async deleteMany(keys, opts) {
        const flowManager = (0, flows_1.getFlowManager)();
        // this is to prevent foreign key constraint error on directus_operations resolve/reject during cascade deletion
        await this.knex('directus_operations').update({ resolve: null, reject: null }).whereIn('flow', keys);
        const result = await super.deleteMany(keys, opts);
        await flowManager.reload();
        return result;
    }
}
exports.FlowsService = FlowsService;
