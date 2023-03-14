"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validate_query_1 = require("./validate-query");
vitest_1.vi.mock('../env', async () => {
    const actual = (await vitest_1.vi.importActual('../env'));
    const MOCK_ENV = {
        ...actual.default,
        MAX_QUERY_LIMIT: 100,
    };
    return {
        default: MOCK_ENV,
        getEnv: () => MOCK_ENV,
    };
});
(0, vitest_1.describe)('export', () => {
    vitest_1.test.each(['csv', 'json', 'xml', 'yaml'])('should accept format %i', (format) => {
        (0, vitest_1.expect)(() => (0, validate_query_1.validateQuery)({ export: format })).not.toThrowError();
    });
    (0, vitest_1.test)('should error with invalid-format', () => {
        (0, vitest_1.expect)(() => (0, validate_query_1.validateQuery)({ export: 'invalid-format' })).toThrowError('"export" must be one of');
    });
});
