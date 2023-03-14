"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const falso_1 = require("@ngneat/falso");
const vitest_1 = require("vitest");
const response_interceptor_1 = require("./response-interceptor");
const validate_ip_1 = require("./validate-ip");
vitest_1.vi.mock('./validate-ip');
let sample;
let sampleResponseConfig;
(0, vitest_1.beforeEach)(() => {
    sample = {
        remoteAddress: (0, falso_1.randIp)(),
        url: (0, falso_1.randUrl)(),
    };
    sampleResponseConfig = {
        request: {
            socket: {
                remoteAddress: sample.remoteAddress,
            },
            url: sample.url,
        },
    };
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.test)(`Calls validateIP with IP/url from axios request config`, async () => {
    await (0, response_interceptor_1.responseInterceptor)(sampleResponseConfig);
    (0, vitest_1.expect)(validate_ip_1.validateIP).toHaveBeenCalledWith(sample.remoteAddress, sample.url);
});
(0, vitest_1.test)(`Returns passed in config as-is`, async () => {
    const config = await (0, response_interceptor_1.responseInterceptor)(sampleResponseConfig);
    (0, vitest_1.expect)(config).toBe(sampleResponseConfig);
});
