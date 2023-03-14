"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const runOperationFlow = vitest_1.vi.fn();
vitest_1.vi.mock('../../flows', () => ({
    getFlowManager: vitest_1.vi.fn().mockReturnValue({
        runOperationFlow,
    }),
}));
const index_1 = __importDefault(require("./index"));
const testFlowId = '00000000-0000-0000-0000-000000000000';
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.test)('runs the target flow one time for payload', async () => {
    const payload = { test: 'payload' };
    await index_1.default.handler({ flow: testFlowId, payload }, {});
    (0, vitest_1.expect)(runOperationFlow).toHaveBeenCalledOnce();
});
(0, vitest_1.test)('runs the target flow N times for number of items in payload array', async () => {
    const payload = [1, 2, 3, 4, 5];
    await index_1.default.handler({ flow: testFlowId, payload }, {});
    (0, vitest_1.expect)(runOperationFlow).toHaveBeenCalledTimes(payload.length);
});
vitest_1.test.each([
    { payload: null, expected: null },
    { payload: { test: 'test' }, expected: { test: 'test' } },
    { payload: '{ "test": "test" }', expected: { test: 'test' } },
])('payload $payload should be sent as $expected', async ({ payload, expected }) => {
    await index_1.default.handler({ flow: testFlowId, payload }, {});
    (0, vitest_1.expect)(runOperationFlow).toHaveBeenCalledWith(testFlowId, expected, vitest_1.expect.anything());
});
