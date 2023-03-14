"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const is_directus_jwt_1 = __importDefault(require("../../src/utils/is-directus-jwt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const vitest_1 = require("vitest");
(0, vitest_1.test)('Returns false for non JWT string', () => {
    const result = (0, is_directus_jwt_1.default)('test');
    (0, vitest_1.expect)(result).toBe(false);
});
(0, vitest_1.test)('Returns false for JWTs with text payload', () => {
    const token = jsonwebtoken_1.default.sign('plaintext', 'secret');
    const result = (0, is_directus_jwt_1.default)(token);
    (0, vitest_1.expect)(result).toBe(false);
});
(0, vitest_1.test)(`Returns false if token issuer isn't "directus"`, () => {
    const token = jsonwebtoken_1.default.sign({ payload: 'content' }, 'secret', { issuer: 'rijk' });
    const result = (0, is_directus_jwt_1.default)(token);
    (0, vitest_1.expect)(result).toBe(false);
});
(0, vitest_1.test)(`Returns true if token is valid JWT and issuer is "directus"`, () => {
    const token = jsonwebtoken_1.default.sign({ payload: 'content' }, 'secret', { issuer: 'directus' });
    const result = (0, is_directus_jwt_1.default)(token);
    (0, vitest_1.expect)(result).toBe(true);
});
