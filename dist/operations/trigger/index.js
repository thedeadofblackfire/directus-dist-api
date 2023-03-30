"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const lodash_1 = require("lodash");
const flows_1 = require("../../flows");
exports.default = (0, utils_1.defineOperationApi)({
    id: 'trigger',
    handler: async ({ flow, payload, iterationMode, batchSize }, context) => {
        const flowManager = (0, flows_1.getFlowManager)();
        const payloadObject = (0, utils_1.optionToObject)(payload) ?? null;
        if (Array.isArray(payloadObject)) {
            if (iterationMode === 'serial') {
                const result = [];
                for (const payload of payloadObject) {
                    result.push(await flowManager.runOperationFlow(flow, payload, (0, lodash_1.omit)(context, 'data')));
                }
                return result;
            }
            if (iterationMode === 'batch') {
                const size = batchSize ?? 10;
                const result = [];
                for (let i = 0; i < payloadObject.length; i += size) {
                    const batch = payloadObject.slice(i, i + size);
                    const batchResults = await Promise.all(batch.map((payload) => {
                        return flowManager.runOperationFlow(flow, payload, (0, lodash_1.omit)(context, 'data'));
                    }));
                    result.push(...batchResults);
                }
                return result;
            }
            if (iterationMode === 'parallel' || !iterationMode) {
                return await Promise.all(payloadObject.map((payload) => {
                    return flowManager.runOperationFlow(flow, payload, (0, lodash_1.omit)(context, 'data'));
                }));
            }
        }
        return await flowManager.runOperationFlow(flow, payloadObject, (0, lodash_1.omit)(context, 'data'));
    },
});
