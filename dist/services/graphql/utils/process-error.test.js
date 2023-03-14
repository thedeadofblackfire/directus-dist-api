"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const vitest_1 = require("vitest");
const process_error_1 = __importDefault(require("./process-error"));
(0, vitest_1.describe)('GraphQL processError util', () => {
    const sampleError = new graphql_1.GraphQLError('An error message', { path: ['test_collection'] });
    const redactedError = {
        message: 'An unexpected error occurred.',
        extensions: {
            code: 'INTERNAL_SERVER_ERROR',
        },
    };
    (0, vitest_1.test)('returns redacted error when unauthenticated', () => {
        (0, vitest_1.expect)((0, process_error_1.default)(null, sampleError)).toEqual(vitest_1.expect.objectContaining(redactedError));
    });
    (0, vitest_1.test)('returns redacted error when authenticated but not an admin', () => {
        (0, vitest_1.expect)((0, process_error_1.default)({ role: 'd674e22b-f405-48ba-9958-9a7bd16a1aa9' }, sampleError)).toEqual(vitest_1.expect.objectContaining(redactedError));
    });
    (0, vitest_1.test)('returns original error when authenticated and is an admin', () => {
        (0, vitest_1.expect)((0, process_error_1.default)({ role: 'd674e22b-f405-48ba-9958-9a7bd16a1aa9', admin: true }, sampleError)).toEqual(vitest_1.expect.objectContaining({
            ...sampleError,
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
            },
        }));
    });
});
