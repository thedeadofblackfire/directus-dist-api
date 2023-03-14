"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const get_cache_headers_1 = require("./get-cache-headers");
let factoryEnv = {};
vitest_1.vi.mock('../../src/env', () => ({
    default: new Proxy({}, {
        get(_target, prop) {
            return factoryEnv[prop];
        },
    }),
    getEnv: vitest_1.vi.fn().mockImplementation(() => factoryEnv),
}));
const scenarios = [
    // Test the cache-control header
    {
        name: 'when cache-Control header includes no-store',
        input: {
            env: { CACHE_SKIP_ALLOWED: true },
            headers: { 'Cache-Control': 'no-store' },
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: false,
            personalized: false,
        },
        output: 'no-store',
    },
    {
        name: 'when cache-Control header does not include no-store',
        input: {
            env: { CACHE_SKIP_ALLOWED: true },
            headers: { other: 'value' },
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: false,
            personalized: false,
        },
        output: 'max-age=5679',
    },
    // Test the ttl value
    {
        name: 'when ttl is undefined',
        input: {
            env: {},
            headers: {},
            accountability: null,
            globalCacheSettings: false,
            personalized: false,
        },
        output: 'no-cache',
    },
    {
        name: 'when ttl is < 0',
        input: {
            env: {},
            headers: {},
            accountability: null,
            ttl: -1,
            globalCacheSettings: false,
            personalized: false,
        },
        output: 'no-cache',
    },
    {
        name: 'when ttl is 0',
        input: {
            env: {},
            headers: {},
            accountability: null,
            ttl: 0,
            globalCacheSettings: false,
            personalized: false,
        },
        output: 'max-age=0',
    },
    // Test CACHE_AUTO_PURGE env for no-cache
    {
        name: 'when CACHE_AUTO_PURGE is true and globalCacheSettings is true',
        input: {
            env: {
                CACHE_AUTO_PURGE: true,
            },
            headers: {},
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: true,
            personalized: false,
        },
        output: 'no-cache',
    },
    {
        name: 'when CACHE_AUTO_PURGE is true and globalCacheSettings is false',
        input: {
            env: {
                CACHE_AUTO_PURGE: true,
            },
            headers: {},
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: false,
            personalized: false,
        },
        output: 'max-age=5679',
    },
    {
        name: 'when CACHE_AUTO_PURGE is true and globalCacheSettings is true',
        input: {
            env: {
                CACHE_AUTO_PURGE: false,
            },
            headers: {},
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: true,
            personalized: false,
        },
        output: 'max-age=5679',
    },
    // Test personalized
    {
        name: 'when personalized is true and accountability is null',
        input: {
            env: {},
            headers: {},
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: false,
            personalized: true,
        },
        output: 'public, max-age=5679',
    },
    {
        name: 'when personalized is true and accountability is provided',
        input: {
            env: {},
            headers: {},
            accountability: {
                role: '7efc7413-7ffe-4e6f-a0ac-687bbf9f8076',
            },
            ttl: 5678910,
            globalCacheSettings: false,
            personalized: true,
        },
        output: 'private, max-age=5679',
    },
    {
        name: 'when personalized is true and accountability with missing role is provided',
        input: {
            env: {},
            headers: {},
            accountability: {},
            ttl: 5678910,
            globalCacheSettings: false,
            personalized: true,
        },
        output: 'public, max-age=5679',
    },
    // Test CACHE_CONTROL_S_MAXAGE env for s-maxage flag
    {
        name: 'when globalCacheSettings is true and CACHE_CONTROL_S_MAXAGE is set',
        input: {
            env: {
                CACHE_CONTROL_S_MAXAGE: 123456,
            },
            headers: {},
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: true,
            personalized: false,
        },
        output: 'max-age=5679, s-maxage=123456',
    },
    {
        name: 'when globalCacheSettings is true and CACHE_CONTROL_S_MAXAGE is not set',
        input: {
            env: {},
            headers: {},
            accountability: null,
            ttl: 5678910,
            globalCacheSettings: true,
            personalized: false,
        },
        output: 'max-age=5679',
    },
];
(0, vitest_1.describe)('get cache headers', () => {
    for (const scenario of scenarios) {
        (0, vitest_1.test)(scenario.name, () => {
            const mockRequest = {
                headers: scenario.input.headers,
                accountability: scenario.input.accountability,
                get: vitest_1.vi.fn().mockImplementation((header) => {
                    var _a;
                    const matchingKey = Object.keys(scenario.input.headers).find((key) => key.toLowerCase() === header);
                    return matchingKey ? (_a = scenario.input.headers) === null || _a === void 0 ? void 0 : _a[matchingKey] : undefined;
                }),
            };
            factoryEnv = scenario.input.env;
            const { ttl, globalCacheSettings, personalized } = scenario.input;
            (0, vitest_1.expect)((0, get_cache_headers_1.getCacheControlHeader)(mockRequest, ttl, globalCacheSettings, personalized)).toEqual(scenario.output);
        });
    }
});
