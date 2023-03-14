"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validate_snapshot_1 = require("./validate-snapshot");
vitest_1.vi.mock('../../package.json', () => ({
    version: '9.22.4',
}));
vitest_1.vi.mock('../database', () => ({
    getDatabaseClient: () => 'sqlite',
}));
(0, vitest_1.describe)('should fail on invalid snapshot schema', () => {
    (0, vitest_1.test)('empty snapshot', () => {
        const snapshot = {};
        (0, vitest_1.expect)(() => (0, validate_snapshot_1.validateSnapshot)(snapshot)).toThrowError('"version" is required');
    });
    (0, vitest_1.test)('invalid version', () => {
        const snapshot = { version: 0 };
        (0, vitest_1.expect)(() => (0, validate_snapshot_1.validateSnapshot)(snapshot)).toThrowError('"version" must be [1]');
    });
    (0, vitest_1.test)('invalid schema', () => {
        const snapshot = { version: 1, directus: '9.22.4', collections: {} };
        (0, vitest_1.expect)(() => (0, validate_snapshot_1.validateSnapshot)(snapshot)).toThrowError('"collections" must be an array');
    });
});
(0, vitest_1.describe)('should require force option on version / vendor mismatch', () => {
    (0, vitest_1.test)('directus version mismatch', () => {
        const snapshot = { version: 1, directus: '9.22.3' };
        (0, vitest_1.expect)(() => (0, validate_snapshot_1.validateSnapshot)(snapshot)).toThrowError("Provided snapshot's directus version 9.22.3 does not match the current instance's version 9.22.4");
    });
    (0, vitest_1.test)('db vendor mismatch', () => {
        const snapshot = { version: 1, directus: '9.22.4', vendor: 'postgres' };
        (0, vitest_1.expect)(() => (0, validate_snapshot_1.validateSnapshot)(snapshot)).toThrowError("Provided snapshot's vendor postgres does not match the current instance's vendor sqlite.");
    });
});
(0, vitest_1.test)('should allow bypass on version / vendor mismatch via force option ', () => {
    const snapshot = { version: 1, directus: '9.22.3', vendor: 'postgres' };
    (0, vitest_1.expect)((0, validate_snapshot_1.validateSnapshot)(snapshot, true)).toBeUndefined();
});
