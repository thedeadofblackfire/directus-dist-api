"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
const axios_1 = __importDefault(require("axios"));
vitest_1.vi.mock('axios');
let mockAxiosInstance;
(0, vitest_1.beforeEach)(() => {
    mockAxiosInstance = {
        interceptors: {
            request: {
                use: vitest_1.vi.fn(),
            },
            response: {
                use: vitest_1.vi.fn(),
            },
        },
    };
    vitest_1.vi.mocked(axios_1.default.create).mockReturnValue(mockAxiosInstance);
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
    index_1._cache.axiosInstance = null;
});
(0, vitest_1.test)('Creates and returns new axios instance if cache is empty', async () => {
    const instance = await (0, index_1.getAxios)();
    (0, vitest_1.expect)(axios_1.default.create).toHaveBeenCalled();
    (0, vitest_1.expect)(instance).toBe(mockAxiosInstance);
});
