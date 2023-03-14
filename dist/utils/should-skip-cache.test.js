"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const env_1 = require("../env");
const should_skip_cache_1 = require("./should-skip-cache");
vitest_1.vi.mock('../env');
(0, vitest_1.test)('should always skip cache for requests coming from data studio', () => {
    const publicURL = 'http://admin.example.com';
    vitest_1.vi.mocked(env_1.getEnv).mockReturnValue({ PUBLIC_URL: publicURL, CACHE_SKIP_ALLOWED: false });
    const req = {
        get: vitest_1.vi.fn((str) => {
            switch (str) {
                case 'Referer':
                    return `${publicURL}/admin/settings/data-model`;
                default:
                    return undefined;
            }
        }),
    };
    (0, vitest_1.expect)((0, should_skip_cache_1.shouldSkipCache)(req)).toBe(true);
});
(0, vitest_1.test)('should not skip cache for requests coming outside of data studio', () => {
    vitest_1.vi.mocked(env_1.getEnv).mockReturnValue({ PUBLIC_URL: 'http://admin.example.com', CACHE_SKIP_ALLOWED: false });
    const req = {
        get: vitest_1.vi.fn((str) => {
            switch (str) {
                case 'Referer':
                    return `http://elsewhere.example.com/admin/settings/data-model`;
                default:
                    return undefined;
            }
        }),
    };
    (0, vitest_1.expect)((0, should_skip_cache_1.shouldSkipCache)(req)).toBe(false);
});
vitest_1.test.each([
    { scenario: 'accept', value: true },
    { scenario: 'ignore', value: false },
])('should $scenario Cache-Control request header containing "no-store" when CACHE_SKIP_ALLOWED is $value', ({ value }) => {
    vitest_1.vi.mocked(env_1.getEnv).mockReturnValue({ PUBLIC_URL: '/', CACHE_SKIP_ALLOWED: value });
    const req = {
        get: vitest_1.vi.fn((str) => {
            switch (str) {
                case 'cache-control':
                    return 'no-store';
                default:
                    return undefined;
            }
        }),
    };
    (0, vitest_1.expect)((0, should_skip_cache_1.shouldSkipCache)(req)).toBe(value);
});
