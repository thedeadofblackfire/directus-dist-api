"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const axiosDefault = vitest_1.vi.fn();
vitest_1.vi.mock('../../request', () => ({
    getAxios: () => axiosDefault.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
    }),
}));
const url = '/';
const method = 'POST';
const index_1 = __importDefault(require("./index"));
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.test)('no headers configured', async () => {
    const body = 'body';
    await index_1.default.handler({ url, method, body }, {});
    (0, vitest_1.expect)(axiosDefault).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
        url,
        method,
        data: body,
        headers: {},
    }));
});
(0, vitest_1.test)('headers array is converted to object', async () => {
    const body = 'body';
    const headers = [
        { header: 'header1', value: 'value1' },
        { header: 'header2', value: 'value2' },
    ];
    await index_1.default.handler({ url, method, body, headers }, {});
    (0, vitest_1.expect)(axiosDefault).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
        url,
        method,
        data: body,
        headers: vitest_1.expect.objectContaining({
            header1: 'value1',
            header2: 'value2',
        }),
    }));
});
(0, vitest_1.test)('should not automatically set Content-Type header when it is already defined', async () => {
    const body = 'body';
    const headers = [{ header: 'Content-Type', value: 'application/octet-stream' }];
    await index_1.default.handler({ url, method, body, headers }, {});
    (0, vitest_1.expect)(axiosDefault).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
        url,
        method,
        data: body,
        headers: vitest_1.expect.objectContaining({
            'Content-Type': vitest_1.expect.not.stringContaining('application/json'),
        }),
    }));
});
(0, vitest_1.test)('should not automatically set Content-Type header to "application/json" when the body is not a valid JSON string', async () => {
    const body = '"a": "b"';
    const headers = [{ header: 'header1', value: 'value1' }];
    await index_1.default.handler({ url, method, body, headers }, {});
    (0, vitest_1.expect)(axiosDefault).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
        url,
        method,
        data: body,
        headers: vitest_1.expect.not.objectContaining({
            'Content-Type': 'application/json',
        }),
    }));
});
(0, vitest_1.test)('should automatically set Content-Type header to "application/json" when the body is a valid JSON string', async () => {
    const body = '{ "a": "b" }';
    const headers = [{ header: 'header1', value: 'value1' }];
    await index_1.default.handler({ url, method, body, headers }, {});
    (0, vitest_1.expect)(axiosDefault).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
        url,
        method,
        data: body,
        headers: vitest_1.expect.objectContaining({
            header1: 'value1',
            'Content-Type': 'application/json',
        }),
    }));
});
