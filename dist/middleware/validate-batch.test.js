"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validate_batch_1 = require("./validate-batch");
require("../../src/types/express.d.ts");
const exceptions_1 = require("../exceptions");
const exceptions_2 = require("@directus/shared/exceptions");
const vitest_1 = require("vitest");
let mockRequest;
let mockResponse;
const nextFunction = vitest_1.vi.fn();
(0, vitest_1.beforeEach)(() => {
    mockRequest = {};
    mockResponse = {};
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.test)('Sets body to empty, calls next on GET requests', async () => {
    mockRequest.method = 'GET';
    await (0, validate_batch_1.validateBatch)('read')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.body).toEqual({});
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
});
(0, vitest_1.test)(`Short circuits on singletons that aren't queried through SEARCH`, async () => {
    mockRequest.method = 'PATCH';
    mockRequest.singleton = true;
    mockRequest.body = { title: 'test' };
    await (0, validate_batch_1.validateBatch)('update')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
});
(0, vitest_1.test)('Throws InvalidPayloadException on missing body', async () => {
    mockRequest.method = 'SEARCH';
    await (0, validate_batch_1.validateBatch)('read')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
    (0, vitest_1.expect)(vitest_1.vi.mocked(nextFunction).mock.calls[0][0]).toBeInstanceOf(exceptions_1.InvalidPayloadException);
});
(0, vitest_1.test)(`Short circuits on Array body in update/delete use`, async () => {
    mockRequest.method = 'PATCH';
    mockRequest.body = [1, 2, 3];
    await (0, validate_batch_1.validateBatch)('update')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.sanitizedQuery).toBe(undefined);
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalled();
});
(0, vitest_1.test)(`Sets sanitizedQuery based on body.query in read operations`, async () => {
    mockRequest.method = 'SEARCH';
    mockRequest.body = {
        query: {
            sort: 'id',
        },
    };
    await (0, validate_batch_1.validateBatch)('read')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(mockRequest.sanitizedQuery).toEqual({
        sort: ['id'],
    });
});
(0, vitest_1.test)(`Doesn't allow both query and keys in a batch delete`, async () => {
    mockRequest.method = 'DELETE';
    mockRequest.body = {
        keys: [1, 2, 3],
        query: { filter: {} },
    };
    await (0, validate_batch_1.validateBatch)('delete')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
    (0, vitest_1.expect)(vitest_1.vi.mocked(nextFunction).mock.calls[0][0]).toBeInstanceOf(exceptions_2.FailedValidationException);
});
(0, vitest_1.test)(`Requires 'data' on batch update`, async () => {
    mockRequest.method = 'PATCH';
    mockRequest.body = {
        keys: [1, 2, 3],
        query: { filter: {} },
    };
    await (0, validate_batch_1.validateBatch)('update')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
    (0, vitest_1.expect)(vitest_1.vi.mocked(nextFunction).mock.calls[0][0]).toBeInstanceOf(exceptions_2.FailedValidationException);
});
(0, vitest_1.test)(`Calls next when all is well`, async () => {
    mockRequest.method = 'PATCH';
    mockRequest.body = {
        query: { filter: {} },
        data: {},
    };
    await (0, validate_batch_1.validateBatch)('update')(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
    (0, vitest_1.expect)(vitest_1.vi.mocked(nextFunction).mock.calls[0][0]).toBeUndefined();
});
