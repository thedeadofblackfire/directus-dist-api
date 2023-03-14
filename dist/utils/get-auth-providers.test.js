"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const get_auth_providers_1 = require("../../src/utils/get-auth-providers");
let factoryEnv = {};
vitest_1.vi.mock('../../src/env', () => ({
    default: new Proxy({}, {
        get(_target, prop) {
            return factoryEnv[prop];
        },
    }),
}));
const scenarios = [
    {
        name: 'when no providers configured',
        input: {},
        output: [],
    },
    {
        name: 'when no driver configured',
        input: {
            AUTH_PROVIDERS: 'directus',
        },
        output: [],
    },
    {
        name: 'when single provider and driver are properly configured',
        input: {
            AUTH_PROVIDERS: 'directus',
            AUTH_DIRECTUS_DRIVER: 'openid',
            AUTH_DIRECTUS_LABEL: 'Directus',
            AUTH_DIRECTUS_ICON: 'hare',
        },
        output: [
            {
                name: 'directus',
                driver: 'openid',
                label: 'Directus',
                icon: 'hare',
            },
        ],
    },
    {
        name: 'when multiple provider and driver are properly configured',
        input: {
            AUTH_PROVIDERS: 'directus,custom',
            AUTH_DIRECTUS_DRIVER: 'openid',
            AUTH_DIRECTUS_LABEL: 'Directus',
            AUTH_DIRECTUS_ICON: 'hare',
            AUTH_CUSTOM_DRIVER: 'openid',
            AUTH_CUSTOM_ICON: 'lock',
        },
        output: [
            {
                name: 'directus',
                driver: 'openid',
                label: 'Directus',
                icon: 'hare',
            },
            {
                name: 'custom',
                driver: 'openid',
                icon: 'lock',
            },
        ],
    },
];
(0, vitest_1.describe)('get auth providers', () => {
    for (const scenario of scenarios) {
        (0, vitest_1.test)(scenario.name, () => {
            factoryEnv = scenario.input;
            (0, vitest_1.expect)((0, get_auth_providers_1.getAuthProviders)()).toEqual(scenario.output);
        });
    }
});
