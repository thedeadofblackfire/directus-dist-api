"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const falso_1 = require("@ngneat/falso");
const vitest_1 = require("vitest");
const env_js_1 = require("../env.js");
const get_config_from_env_js_1 = require("../utils/get-config-from-env.js");
const register_locations_js_1 = require("./register-locations.js");
vitest_1.vi.mock('../env.js');
vitest_1.vi.mock('@directus/shared/utils');
vitest_1.vi.mock('../utils/get-config-from-env.js');
let sample;
let mockStorage;
(0, vitest_1.beforeEach)(() => {
    sample = {
        options: {},
        locations: (0, falso_1.randWord)({ length: (0, falso_1.randNumber)({ min: 1, max: 10 }) }),
    };
    sample.locations.forEach((location) => {
        const keys = (0, falso_1.randWord)({ length: (0, falso_1.randNumber)({ min: 1, max: 10 }) });
        const values = (0, falso_1.randWord)({ length: keys.length });
        sample.options[`STORAGE_${location.toUpperCase()}_`] = {
            driver: (0, falso_1.randWord)(),
        };
        keys.forEach((key, index) => (sample.options[`STORAGE_${location.toUpperCase()}_`][key] = values[index]));
    });
    mockStorage = {
        registerLocation: vitest_1.vi.fn(),
    };
    vitest_1.vi.mocked(get_config_from_env_js_1.getConfigFromEnv).mockImplementation((name) => sample.options[name]);
    vitest_1.vi.mocked(env_js_1.getEnv).mockReturnValue({
        STORAGE_LOCATIONS: sample.locations.join(', '),
    });
    vitest_1.vi.mocked(utils_1.toArray).mockReturnValue(sample.locations);
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.test)('Converts storage locations env var to array', async () => {
    await (0, register_locations_js_1.registerLocations)(mockStorage);
    (0, vitest_1.expect)(utils_1.toArray).toHaveBeenCalledWith(sample.locations.join(', '));
});
(0, vitest_1.test)('Gets config for each location', async () => {
    await (0, register_locations_js_1.registerLocations)(mockStorage);
    (0, vitest_1.expect)(get_config_from_env_js_1.getConfigFromEnv).toHaveBeenCalledTimes(sample.locations.length);
    sample.locations.forEach((location) => (0, vitest_1.expect)(get_config_from_env_js_1.getConfigFromEnv).toHaveBeenCalledWith(`STORAGE_${location.toUpperCase()}_`));
});
(0, vitest_1.test)('Registers location with driver options for each location', async () => {
    await (0, register_locations_js_1.registerLocations)(mockStorage);
    (0, vitest_1.expect)(mockStorage.registerLocation).toHaveBeenCalledTimes(sample.locations.length);
    sample.locations.forEach((location) => {
        const { driver, ...options } = sample.options[`STORAGE_${location.toUpperCase()}_`];
        (0, vitest_1.expect)(mockStorage.registerLocation).toHaveBeenCalledWith(location, {
            driver,
            options,
        });
    });
});
