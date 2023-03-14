"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-expect-error https://github.com/microsoft/TypeScript/issues/49721
const storage_1 = require("@directus/storage");
const vitest_1 = require("vitest");
const validate_env_js_1 = require("../utils/validate-env.js");
const index_js_1 = require("./index.js");
const register_drivers_js_1 = require("./register-drivers.js");
const register_locations_js_1 = require("./register-locations.js");
vitest_1.vi.mock('@directus/storage');
vitest_1.vi.mock('./register-drivers.js');
vitest_1.vi.mock('./register-locations.js');
vitest_1.vi.mock('../utils/validate-env.js');
let mockStorage;
(0, vitest_1.beforeEach)(() => {
    mockStorage = {};
    index_js_1._cache.storage = null;
    vitest_1.vi.mocked(storage_1.StorageManager).mockReturnValue(mockStorage);
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.test)('Returns storage from cache immediately if cache has been filled', async () => {
    index_js_1._cache.storage = mockStorage;
    (0, vitest_1.expect)(await (0, index_js_1.getStorage)());
});
(0, vitest_1.test)('Validates STORAGE_LOCATIONS to exist in env', async () => {
    await (0, index_js_1.getStorage)();
    (0, vitest_1.expect)(validate_env_js_1.validateEnv).toHaveBeenCalledWith(['STORAGE_LOCATIONS']);
});
(0, vitest_1.test)('Creates new StorageManager instance in cache', async () => {
    await (0, index_js_1.getStorage)();
    (0, vitest_1.expect)(storage_1.StorageManager).toHaveBeenCalledOnce();
    (0, vitest_1.expect)(storage_1.StorageManager).toHaveBeenCalledWith();
    (0, vitest_1.expect)(index_js_1._cache.storage).toBe(mockStorage);
});
(0, vitest_1.test)('Registers drivers against cached storage manager', async () => {
    await (0, index_js_1.getStorage)();
    (0, vitest_1.expect)(register_drivers_js_1.registerDrivers).toHaveBeenCalledWith(index_js_1._cache.storage);
});
(0, vitest_1.test)('Registers locations against cached storage manager', async () => {
    await (0, index_js_1.getStorage)();
    (0, vitest_1.expect)(register_locations_js_1.registerLocations).toHaveBeenCalledWith(index_js_1._cache.storage);
});
(0, vitest_1.test)('Returns cached storage manager', async () => {
    const storage = await (0, index_js_1.getStorage)();
    (0, vitest_1.expect)(storage).toBe(index_js_1._cache.storage);
    (0, vitest_1.expect)(storage).toBe(mockStorage);
});
