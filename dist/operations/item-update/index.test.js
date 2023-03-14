"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../services', () => {
    const ItemsService = vitest_1.vi.fn();
    ItemsService.prototype.updateByQuery = vitest_1.vi.fn();
    ItemsService.prototype.updateOne = vitest_1.vi.fn();
    ItemsService.prototype.updateMany = vitest_1.vi.fn();
    return { ItemsService };
});
vitest_1.vi.mock('../../utils/get-accountability-for-role', () => ({
    getAccountabilityForRole: vitest_1.vi.fn((role, _context) => Promise.resolve(role)),
}));
const services_1 = require("../../services");
const index_1 = __importDefault(require("./index"));
const testCollection = 'test';
const testPayload = {};
const testId = '00000000-0000-0000-0000-000000000000';
const testAccountability = { user: testId, role: testId };
const getSchema = vitest_1.vi.fn().mockResolvedValue({});
(0, vitest_1.describe)('Operations / Item Update', () => {
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
        await index_1.default.handler({ collection: testCollection, payload: testPayload, permissions }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService)).toHaveBeenCalledWith(testCollection, vitest_1.expect.objectContaining({ schema: {}, accountability: expected, knex: undefined }));
    });
    (0, vitest_1.test)('should return null when payload is not defined', async () => {
        const result = await index_1.default.handler({ collection: testCollection }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(result).toBe(null);
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateByQuery).not.toHaveBeenCalled();
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateOne).not.toHaveBeenCalled();
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateMany).not.toHaveBeenCalled();
    });
    vitest_1.test.each([undefined, []])('should call updateByQuery with correct query when key is $payload', async (key) => {
        const query = { limit: -1 };
        await index_1.default.handler({ collection: testCollection, payload: testPayload, query, key }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateByQuery).toHaveBeenCalledWith(query, testPayload, vitest_1.expect.anything());
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateOne).not.toHaveBeenCalled();
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateMany).not.toHaveBeenCalled();
    });
    (0, vitest_1.test)('should emit events for updateByQuery when true', async () => {
        const query = { limit: -1 };
        await index_1.default.handler({ collection: testCollection, payload: testPayload, query, emitEvents: true }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateByQuery).toHaveBeenCalledWith(query, testPayload, {
            emitEvents: true,
        });
    });
    vitest_1.test.each([undefined, false])('should not emit events for updateByQuery when %s', async (emitEvents) => {
        const query = { limit: -1 };
        await index_1.default.handler({ collection: testCollection, payload: testPayload, query, emitEvents }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateByQuery).toHaveBeenCalledWith(query, testPayload, {
            emitEvents: false,
        });
    });
    vitest_1.test.each([1, [1]])('should call updateOne when key is $payload', async (key) => {
        await index_1.default.handler({ collection: testCollection, payload: testPayload, key }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateByQuery).not.toHaveBeenCalled();
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateOne).toHaveBeenCalled();
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateMany).not.toHaveBeenCalled();
    });
    (0, vitest_1.test)('should emit events for updateOne when true', async () => {
        const key = 1;
        await index_1.default.handler({ collection: testCollection, payload: testPayload, key, emitEvents: true }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateOne).toHaveBeenCalledWith(key, testPayload, { emitEvents: true });
    });
    vitest_1.test.each([undefined, false])('should not emit events for updateOne when %s', async (emitEvents) => {
        const key = 1;
        await index_1.default.handler({ collection: testCollection, payload: testPayload, key: key, emitEvents }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateOne).toHaveBeenCalledWith(key, testPayload, { emitEvents: false });
    });
    (0, vitest_1.test)('should call updateMany when key is an array with more than one item', async () => {
        await index_1.default.handler({ collection: testCollection, payload: testPayload, key: [1, 2, 3] }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateByQuery).not.toHaveBeenCalled();
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateOne).not.toHaveBeenCalled();
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateMany).toHaveBeenCalled();
    });
    (0, vitest_1.test)('should emit events for updateMany when true', async () => {
        const keys = [1, 2, 3];
        await index_1.default.handler({ collection: testCollection, payload: testPayload, key: keys, emitEvents: true }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateMany).toHaveBeenCalledWith(keys, testPayload, { emitEvents: true });
    });
    vitest_1.test.each([undefined, false])('should not emit events for updateMany when %s', async (emitEvents) => {
        const keys = [1, 2, 3];
        await index_1.default.handler({ collection: testCollection, payload: testPayload, key: keys, emitEvents }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.ItemsService).prototype.updateMany).toHaveBeenCalledWith(keys, testPayload, { emitEvents: false });
    });
});
