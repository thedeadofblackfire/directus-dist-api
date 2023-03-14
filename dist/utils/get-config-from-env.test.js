"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_config_from_env_1 = require("../../src/utils/get-config-from-env");
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../src/env', () => {
    const MOCK_ENV = {
        OBJECT_BRAND__COLOR: 'purple',
        OBJECT_BRAND__HEX: '#6644FF',
        CAMELCASE_OBJECT__FIRST_KEY: 'firstValue',
        CAMELCASE_OBJECT__SECOND_KEY: 'secondValue',
    };
    return {
        default: MOCK_ENV,
        getEnv: () => MOCK_ENV,
    };
});
(0, vitest_1.describe)('get config from env', () => {
    (0, vitest_1.test)('Keys with double underscore should be an object', () => {
        (0, vitest_1.expect)((0, get_config_from_env_1.getConfigFromEnv)('OBJECT_')).toStrictEqual({ brand: { color: 'purple', hex: '#6644FF' } });
    });
    (0, vitest_1.test)('Keys with double underscore should be an object with camelCase keys', () => {
        (0, vitest_1.expect)((0, get_config_from_env_1.getConfigFromEnv)('CAMELCASE_')).toStrictEqual({
            object: { firstKey: 'firstValue', secondKey: 'secondValue' },
        });
    });
});
