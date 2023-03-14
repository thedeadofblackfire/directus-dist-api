"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const falso_1 = require("@ngneat/falso");
const axios_1 = __importDefault(require("axios"));
const promises_1 = require("node:dns/promises");
const node_net_1 = require("node:net");
const node_url_1 = require("node:url");
const vitest_1 = require("vitest");
const logger_1 = __importDefault(require("../logger"));
const request_interceptor_1 = require("./request-interceptor");
const validate_ip_1 = require("./validate-ip");
vitest_1.vi.mock('axios');
vitest_1.vi.mock('node:net');
vitest_1.vi.mock('node:url');
vitest_1.vi.mock('node:dns/promises');
vitest_1.vi.mock('./validate-ip');
vitest_1.vi.mock('../logger');
let sample;
(0, vitest_1.beforeEach)(() => {
    sample = {
        config: {},
        url: (0, falso_1.randUrl)(),
        hostname: (0, falso_1.randWord)(),
        ip: (0, falso_1.randIp)(),
    };
    vitest_1.vi.mocked(axios_1.default.getUri).mockReturnValue(sample.url);
    vitest_1.vi.mocked(node_url_1.URL).mockReturnValue({ hostname: sample.hostname });
    vitest_1.vi.mocked(promises_1.lookup).mockResolvedValue({ address: sample.ip });
    vitest_1.vi.mocked(node_net_1.isIP).mockReturnValue(0);
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.test)('Uses axios getUri to get full URI', async () => {
    await (0, request_interceptor_1.requestInterceptor)(sample.config);
    (0, vitest_1.expect)(axios_1.default.getUri).toHaveBeenCalledWith(sample.config);
});
(0, vitest_1.test)('Gets hostname using URL', async () => {
    await (0, request_interceptor_1.requestInterceptor)(sample.config);
    (0, vitest_1.expect)(node_url_1.URL).toHaveBeenCalledWith(sample.url);
});
(0, vitest_1.test)('Checks if hostname is IP', async () => {
    await (0, request_interceptor_1.requestInterceptor)(sample.config);
    (0, vitest_1.expect)(node_net_1.isIP).toHaveBeenCalledWith(sample.hostname);
});
(0, vitest_1.test)('Looks up IP address using dns lookup if hostname is not an IP address', async () => {
    await (0, request_interceptor_1.requestInterceptor)(sample.config);
    (0, vitest_1.expect)(promises_1.lookup).toHaveBeenCalledWith(sample.hostname);
});
(0, vitest_1.test)('Logs when the lookup throws an error', async () => {
    const mockError = new Error();
    vitest_1.vi.mocked(promises_1.lookup).mockRejectedValue(mockError);
    try {
        await (0, request_interceptor_1.requestInterceptor)(sample.config);
    }
    catch {
        // Expect to error
    }
    finally {
        (0, vitest_1.expect)(logger_1.default.warn).toHaveBeenCalledWith(mockError, `Couldn't lookup the DNS for url "${sample.url}"`);
    }
});
(0, vitest_1.test)('Throws error when dns lookup fails', async () => {
    const mockError = new Error();
    vitest_1.vi.mocked(promises_1.lookup).mockRejectedValue(mockError);
    try {
        await (0, request_interceptor_1.requestInterceptor)(sample.config);
    }
    catch (err) {
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(err.message).toBe(`Requested URL "${sample.url}" resolves to a denied IP address`);
    }
});
(0, vitest_1.test)('Validates IP', async () => {
    await (0, request_interceptor_1.requestInterceptor)(sample.config);
    (0, vitest_1.expect)(validate_ip_1.validateIP).toHaveBeenCalledWith(sample.ip, sample.url);
});
(0, vitest_1.test)('Validates IP from hostname if URL hostname is IP', async () => {
    vitest_1.vi.mocked(node_net_1.isIP).mockReturnValue(4);
    await (0, request_interceptor_1.requestInterceptor)(sample.config);
    (0, vitest_1.expect)(validate_ip_1.validateIP).toHaveBeenCalledWith(sample.hostname, sample.url);
});
(0, vitest_1.test)('Returns config unmodified', async () => {
    const config = await (0, request_interceptor_1.requestInterceptor)(sample.config);
    (0, vitest_1.expect)(config).toBe(config);
});
