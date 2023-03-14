"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const falso_1 = require("@ngneat/falso");
const vitest_1 = require("vitest");
const env_js_1 = require("../env.js");
const get_storage_driver_js_1 = require("./get-storage-driver.js");
const register_drivers_js_1 = require("./register-drivers.js");
vitest_1.vi.mock('./get-storage-driver.js');
vitest_1.vi.mock('../env');
let mockStorage;
let mockDriver;
let sample;
(0, vitest_1.beforeEach)(() => {
    mockStorage = {
        registerDriver: vitest_1.vi.fn(),
    };
    mockDriver = {};
    vitest_1.vi.mocked(get_storage_driver_js_1.getStorageDriver).mockResolvedValue(mockDriver);
    sample = {
        name: (0, falso_1.randWord)(),
    };
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.test)('Does nothing if no storage drivers are configured in Env', async () => {
    vitest_1.vi.mocked(env_js_1.getEnv).mockReturnValue({});
    await (0, register_drivers_js_1.registerDrivers)(mockStorage);
    (0, vitest_1.expect)(mockStorage.registerDriver).toHaveBeenCalledTimes(0);
});
(0, vitest_1.test)('Ignores environment variables that do not start with STORAGE_ and end with _DRIVER', async () => {
    vitest_1.vi.mocked(env_js_1.getEnv).mockReturnValue({
        [`NOSTORAGE_${(0, falso_1.randWord)().toUpperCase()}_DRIVER`]: (0, falso_1.randWord)(),
        [`STORAGE_${(0, falso_1.randWord)().toUpperCase()}_NODRIVER`]: (0, falso_1.randWord)(),
    });
    await (0, register_drivers_js_1.registerDrivers)(mockStorage);
    (0, vitest_1.expect)(mockStorage.registerDriver).toHaveBeenCalledTimes(0);
});
(0, vitest_1.test)('Only registers driver once per library', async () => {
    vitest_1.vi.mocked(env_js_1.getEnv).mockReturnValue({
        [`STORAGE_${(0, falso_1.randWord)().toUpperCase()}_DRIVER`]: sample.name,
        [`STORAGE_${(0, falso_1.randWord)().toUpperCase()}_DRIVER`]: sample.name,
    });
    await (0, register_drivers_js_1.registerDrivers)(mockStorage);
    (0, vitest_1.expect)(mockStorage.registerDriver).toHaveBeenCalledOnce();
});
(0, vitest_1.test)('Gets storage driver for name', async () => {
    vitest_1.vi.mocked(env_js_1.getEnv).mockReturnValue({
        [`STORAGE_${(0, falso_1.randWord)().toUpperCase()}_DRIVER`]: sample.name,
    });
    await (0, register_drivers_js_1.registerDrivers)(mockStorage);
    (0, vitest_1.expect)(get_storage_driver_js_1.getStorageDriver).toHaveBeenCalledWith(sample.name);
});
(0, vitest_1.test)('Registers storage driver to manager', async () => {
    vitest_1.vi.mocked(env_js_1.getEnv).mockReturnValue({
        [`STORAGE_${(0, falso_1.randWord)().toUpperCase()}_DRIVER`]: sample.name,
    });
    await (0, register_drivers_js_1.registerDrivers)(mockStorage);
    (0, vitest_1.expect)(mockStorage.registerDriver).toHaveBeenCalledWith(sample.name, mockDriver);
});
