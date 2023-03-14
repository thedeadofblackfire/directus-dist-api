"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const falso_1 = require("@ngneat/falso");
const vitest_1 = require("vitest");
const get_storage_driver_js_1 = require("./get-storage-driver.js");
(0, vitest_1.test)('Returns imported installed driver for each supported driver', async () => {
    for (const driverKey of Object.keys(get_storage_driver_js_1._aliasMap)) {
        const driver = await (0, get_storage_driver_js_1.getStorageDriver)(driverKey);
        (0, vitest_1.expect)(driver).not.toBeUndefined();
    }
});
(0, vitest_1.test)('Throws error for key that is not supported', async () => {
    const driverKey = `fake-${(0, falso_1.randWord)()}`;
    try {
        await (0, get_storage_driver_js_1.getStorageDriver)(driverKey);
    }
    catch (err) {
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(err.message).toBe(`Driver "${driverKey}" doesn't exist.`);
    }
});
