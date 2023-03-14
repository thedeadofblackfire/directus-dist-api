"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../services', () => {
    const NotificationsService = vitest_1.vi.fn();
    NotificationsService.prototype.createMany = vitest_1.vi.fn();
    return { NotificationsService };
});
vitest_1.vi.mock('../../utils/get-accountability-for-role', () => ({
    getAccountabilityForRole: vitest_1.vi.fn((role, _context) => Promise.resolve(role)),
}));
const services_1 = require("../../services");
const index_1 = __importDefault(require("./index"));
const testId = '00000000-0000-0000-0000-000000000000';
const testAccountability = { user: testId, role: testId };
const testRecipient = [testId];
const getSchema = vitest_1.vi.fn().mockResolvedValue({});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
vitest_1.test.each([
    { permissions: undefined, expected: testAccountability },
    { permissions: '$trigger', expected: testAccountability },
    { permissions: '$full', expected: null },
    { permissions: '$public', expected: null },
    { permissions: 'test', expected: 'test' },
])('accountability for permissions "$permissions" should be $expected', async ({ permissions, expected }) => {
    await index_1.default.handler({ permissions }, { accountability: testAccountability, getSchema });
    (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.NotificationsService)).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ accountability: expected }));
});
vitest_1.test.each([
    { message: null, expected: null },
    { message: 123, expected: '123' },
    { message: { test: 'test' }, expected: '{"test":"test"}' },
])('message $message should be sent as string $expected', async ({ message, expected }) => {
    await index_1.default.handler({ recipient: testRecipient, message }, { accountability: testAccountability, getSchema });
    (0, vitest_1.expect)(vitest_1.vi.mocked(services_1.NotificationsService).prototype.createMany).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([vitest_1.expect.objectContaining({ message: expected })]));
});
