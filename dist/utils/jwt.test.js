"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const vitest_1 = require("vitest");
const exceptions_1 = require("../../src/exceptions");
const jwt_1 = require("../../src/utils/jwt");
const payload = { role: null, app_access: false, admin_access: false };
const secret = 'test-secret';
const options = { issuer: 'directus' };
(0, vitest_1.test)('Returns the payload of a correctly signed token', () => {
    const token = jsonwebtoken_1.default.sign(payload, secret, options);
    const result = (0, jwt_1.verifyAccessJWT)(token, secret);
    (0, vitest_1.expect)(result).toEqual(payload);
});
(0, vitest_1.test)('Throws TokenExpiredException when token used has expired', () => {
    const token = jsonwebtoken_1.default.sign({ ...payload, exp: new Date().getTime() / 1000 - 500 }, secret, options);
    (0, vitest_1.expect)(() => (0, jwt_1.verifyAccessJWT)(token, secret)).toThrow(exceptions_1.TokenExpiredException);
});
const InvalidTokenCases = {
    'wrong issuer': jsonwebtoken_1.default.sign(payload, secret, { issuer: 'wrong' }),
    'wrong secret': jsonwebtoken_1.default.sign(payload, 'wrong-secret', options),
    'string payload': jsonwebtoken_1.default.sign('illegal payload', secret),
    'missing properties in token payload': jsonwebtoken_1.default.sign({ role: null }, secret, options),
};
Object.entries(InvalidTokenCases).forEach(([title, token]) => (0, vitest_1.test)(`Throws InvalidTokenError - ${title}`, () => {
    (0, vitest_1.expect)(() => (0, jwt_1.verifyAccessJWT)(token, secret)).toThrow(exceptions_1.InvalidTokenException);
}));
(0, vitest_1.test)(`Throws ServiceUnavailableException for unexpected error from jsonwebtoken`, () => {
    vitest_1.vi.spyOn(jsonwebtoken_1.default, 'verify').mockImplementation(() => {
        throw new Error();
    });
    const token = jsonwebtoken_1.default.sign(payload, secret, options);
    (0, vitest_1.expect)(() => (0, jwt_1.verifyAccessJWT)(token, secret)).toThrow(exceptions_1.ServiceUnavailableException);
});
