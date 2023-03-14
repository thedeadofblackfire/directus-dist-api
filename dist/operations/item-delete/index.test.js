"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const services_1 = require("../../services");
const index_1 = __importDefault(require("./index"));
vitest_1.vi.mock('../../services', () => {
    const ItemsService = vitest_1.vi.fn();
    ItemsService.prototype.deleteByQuery = vitest_1.vi.fn();
    ItemsService.prototype.deleteOne = vitest_1.vi.fn();
    ItemsService.prototype.deleteMany = vitest_1.vi.fn();
    return { ItemsService };
});
const getSchema = vitest_1.vi.fn().mockResolvedValue({});
vitest_1.vi.mock('../../utils/get-accountability-for-role', () => ({
    getAccountabilityForRole: vitest_1.vi.fn((role, _context) => Promise.resolve(role)),
}));
const testCollection = 'test';
const testQuery = { limit: -1 };
const testId = '00000000-0000-0000-0000-000000000000';
const testAccountability = { user: testId, role: testId };
(0, vitest_1.describe)('Operations / Item Delete', () => {
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
        await index_1.default.handler({ collection: testCollection, query: testQuery, permissions }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService).toHaveBeenCalledWith(testCollection, vitest_1.expect.objectContaining({ schema: {}, accountability: expected, knex: undefined }));
    });
    (0, vitest_1.test)('should have fallback when query is not defined', async () => {
        await index_1.default.handler({ collection: testCollection }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteByQuery).toHaveBeenCalledWith({}, vitest_1.expect.anything());
    });
    vitest_1.test.each([undefined, []])('should call deleteByQuery with correct query when key is $payload', async (key) => {
        await index_1.default.handler({ collection: testCollection, query: testQuery, key }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteByQuery).toHaveBeenCalledWith(testQuery, vitest_1.expect.anything());
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteOne).not.toHaveBeenCalled();
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteMany).not.toHaveBeenCalled();
    });
    (0, vitest_1.test)('should emit events for deleteByQuery when true', async () => {
        await index_1.default.handler({ collection: testCollection, query: testQuery, emitEvents: true }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteByQuery).toHaveBeenCalledWith(testQuery, { emitEvents: true });
    });
    vitest_1.test.each([undefined, false])('should not emit events for deleteByQuery when %s', async (emitEvents) => {
        await index_1.default.handler({ collection: testCollection, query: testQuery, emitEvents }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteByQuery).toHaveBeenCalledWith(testQuery, { emitEvents: false });
    });
    vitest_1.test.each([1, [1]])('should call deleteOne when key is $payload', async (key) => {
        await index_1.default.handler({ collection: testCollection, key }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteByQuery).not.toHaveBeenCalled();
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteOne).toHaveBeenCalled();
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteMany).not.toHaveBeenCalled();
    });
    (0, vitest_1.test)('should emit events for deleteOne when true', async () => {
        const key = 1;
        await index_1.default.handler({ collection: testCollection, key, emitEvents: true }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteOne).toHaveBeenCalledWith(key, { emitEvents: true });
    });
    vitest_1.test.each([undefined, false])('should not emit events for deleteOne when %s', async (emitEvents) => {
        const key = 1;
        await index_1.default.handler({ collection: testCollection, key, emitEvents }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteOne).toHaveBeenCalledWith(key, { emitEvents: false });
    });
    (0, vitest_1.test)('should call deleteMany when key is an array with more than one item', async () => {
        await index_1.default.handler({ collection: testCollection, key: [1, 2, 3] }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteByQuery).not.toHaveBeenCalled();
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteOne).not.toHaveBeenCalled();
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteMany).toHaveBeenCalled();
    });
    (0, vitest_1.test)('should emit events for deleteMany when true', async () => {
        const keys = [1, 2, 3];
        await index_1.default.handler({ collection: testCollection, key: keys, emitEvents: true }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteMany).toHaveBeenCalledWith(keys, { emitEvents: true });
    });
    vitest_1.test.each([undefined, false])('should not emit events for deleteMany when %s', async (emitEvents) => {
        const keys = [1, 2, 3];
        await index_1.default.handler({ collection: testCollection, key: keys, emitEvents }, { accountability: testAccountability, getSchema });
        (0, vitest_1.expect)(services_1.ItemsService.prototype.deleteMany).toHaveBeenCalledWith(keys, { emitEvents: false });
    });
});
