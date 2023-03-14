"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../services', () => {
    const ItemsService = vitest_1.vi.fn();
    ItemsService.prototype.createMany = vitest_1.vi.fn();
    return { ItemsService };
});
vitest_1.vi.mock('../../utils/get-accountability-for-role', () => ({
    getAccountabilityForRole: vitest_1.vi.fn((role, _context) => Promise.resolve(role)),
}));
const services_1 = require("../../services");
const index_1 = __importDefault(require("./index"));
const testCollection = 'test';
const testId = '00000000-0000-0000-0000-000000000000';
const testAccountability = { user: testId, role: testId };
const getSchema = vitest_1.vi.fn().mockResolvedValue({});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
vitest_1.test.each([
    { permissions: undefined, expected: testAccountability },
    { permissions: '$trigger', expected: testAccountability },
    { permissions: '$full', expected: 'system' },
    { permissions: '$public', expected: null },
    { permissions: 'test', expected: 'test' },
])('accountability for permissions "$permissions" should be $expected', async ({ permissions, expected }) => {
    await index_1.default.handler({ collection: testCollection, permissions }, { accountability: testAccountability, getSchema });
    (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService)).toHaveBeenCalledWith(testCollection, vitest_1.expect.objectContaining({ schema: {}, accountability: expected, knex: undefined }));
});
vitest_1.test.each([
    { payload: null, expected: null },
    { payload: { test: 'test' }, expected: [{ test: 'test' }] },
])('payload $payload should be passed as $expected', async ({ payload, expected }) => {
    await index_1.default.handler({ collection: testCollection, payload }, { accountability: testAccountability, getSchema });
    if (expected) {
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.createMany).toHaveBeenCalledWith(expected, vitest_1.expect.anything());
    }
    else {
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.createMany).not.toHaveBeenCalled();
    }
});
(0, vitest_1.test)('should emit events when true', async () => {
    await index_1.default.handler({ collection: testCollection, payload: {}, emitEvents: true }, { accountability: testAccountability, getSchema });
    (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.createMany).toHaveBeenCalledWith([{}], { emitEvents: true });
});
vitest_1.test.each([undefined, false])('should not emit events when %s', async (emitEvents) => {
    await index_1.default.handler({ collection: testCollection, payload: {}, emitEvents }, { accountability: testAccountability, getSchema });
    (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.createMany).toHaveBeenCalledWith([{}], { emitEvents: false });
});
