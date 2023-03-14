"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const falso_1 = require("@ngneat/falso");
const node_os_1 = __importDefault(require("node:os"));
const vitest_1 = require("vitest");
const env_1 = require("../env");
const validate_ip_1 = require("./validate-ip");
vitest_1.vi.mock('../env');
vitest_1.vi.mock('node:os');
let sample;
(0, vitest_1.beforeEach)(() => {
    sample = {
        ip: (0, falso_1.randIp)(),
        url: (0, falso_1.randUrl)(),
    };
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.test)(`Does nothing if IP is valid`, async () => {
    vitest_1.vi.mocked(env_1.getEnv).mockReturnValue({ IMPORT_IP_DENY_LIST: [] });
    await (0, validate_ip_1.validateIP)(sample.ip, sample.url);
});
(0, vitest_1.test)(`Throws error if passed IP is denylisted`, async () => {
    vitest_1.vi.mocked(env_1.getEnv).mockReturnValue({ IMPORT_IP_DENY_LIST: [sample.ip] });
    try {
        await (0, validate_ip_1.validateIP)(sample.ip, sample.url);
    }
    catch (err) {
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(err.message).toBe(`Requested URL "${sample.url}" resolves to a denied IP address`);
    }
});
(0, vitest_1.test)(`Checks against IPs of local networkInterfaces if IP deny list contains 0.0.0.0`, async () => {
    vitest_1.vi.mocked(env_1.getEnv).mockReturnValue({ IMPORT_IP_DENY_LIST: ['0.0.0.0'] });
    vitest_1.vi.mocked(node_os_1.default.networkInterfaces).mockReturnValue({});
    await (0, validate_ip_1.validateIP)(sample.ip, sample.url);
    (0, vitest_1.expect)(node_os_1.default.networkInterfaces).toHaveBeenCalledOnce();
});
(0, vitest_1.test)(`Throws error if IP address matches resolved localhost IP`, async () => {
    vitest_1.vi.mocked(env_1.getEnv).mockReturnValue({ IMPORT_IP_DENY_LIST: ['0.0.0.0'] });
    vitest_1.vi.mocked(node_os_1.default.networkInterfaces).mockReturnValue({
        fa0: undefined,
        lo0: [
            {
                address: '127.0.0.1',
                netmask: '255.0.0.0',
                family: 'IPv4',
                mac: '00:00:00:00:00:00',
                internal: true,
                cidr: '127.0.0.1/8',
            },
        ],
        en0: [
            {
                address: sample.ip,
                netmask: '255.0.0.0',
                family: 'IPv4',
                mac: '00:00:00:00:00:00',
                internal: true,
                cidr: '127.0.0.1/8',
            },
        ],
    });
    try {
        await (0, validate_ip_1.validateIP)(sample.ip, sample.url);
    }
    catch (err) {
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(err.message).toBe(`Requested URL "${sample.url}" resolves to a denied IP address`);
    }
});
