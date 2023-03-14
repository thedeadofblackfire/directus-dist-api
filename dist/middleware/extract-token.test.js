"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const extract_token_1 = __importDefault(require("../../src/middleware/extract-token"));
require("../../src/types/express.d.ts");
const vitest_1 = require("vitest");
let mockRequest;
let mockResponse;
const nextFunction = vitest_1.vi.fn();
(0, vitest_1.beforeEach)(() => {
    mockRequest = {};
    mockResponse = {};
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.test)('Token from query', () => {
    mockRequest = {
        query: {
            access_token: 'test',
        },
    };
    (0, extract_token_1.default)(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.token).toBe('test');
    (0, vitest_1.expect)(nextFunction).toBeCalledTimes(1);
});
(0, vitest_1.test)('Token from Authorization header (capitalized)', () => {
    mockRequest = {
        headers: {
            authorization: 'Bearer test',
        },
    };
    (0, extract_token_1.default)(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.token).toBe('test');
    (0, vitest_1.expect)(nextFunction).toBeCalledTimes(1);
});
(0, vitest_1.test)('Token from Authorization header (lowercase)', () => {
    mockRequest = {
        headers: {
            authorization: 'bearer test',
        },
    };
    (0, extract_token_1.default)(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.token).toBe('test');
    (0, vitest_1.expect)(nextFunction).toBeCalledTimes(1);
});
(0, vitest_1.test)('Ignore the token if authorization header is too many parts', () => {
    mockRequest = {
        headers: {
            authorization: 'bearer test what another one',
        },
    };
    (0, extract_token_1.default)(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.token).toBeNull();
    (0, vitest_1.expect)(nextFunction).toBeCalledTimes(1);
});
(0, vitest_1.test)('Null if no token passed', () => {
    (0, extract_token_1.default)(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.token).toBeNull();
    (0, vitest_1.expect)(nextFunction).toBeCalledTimes(1);
});
