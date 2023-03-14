"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../database"));
const emitter_1 = __importDefault(require("../emitter"));
const env_1 = __importDefault(require("../env"));
const exceptions_1 = require("../exceptions");
const authenticate_1 = require("./authenticate");
require("../../src/types/express.d.ts");
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../src/database');
vitest_1.vi.mock('../../src/env', () => {
    const MOCK_ENV = {
        SECRET: 'test',
    };
    return {
        default: MOCK_ENV,
        getEnv: () => MOCK_ENV,
    };
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.test)('Short-circuits when authenticate filter is used', async () => {
    const req = {
        ip: '127.0.0.1',
        get: vitest_1.vi.fn(),
    };
    const res = {};
    const next = vitest_1.vi.fn();
    const customAccountability = { admin: true };
    vitest_1.vi.spyOn(emitter_1.default, 'emitFilter').mockResolvedValue(customAccountability);
    await (0, authenticate_1.handler)(req, res, next);
    (0, vitest_1.expect)(req.accountability).toEqual(customAccountability);
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
});
(0, vitest_1.test)('Uses default public accountability when no token is given', async () => {
    const req = {
        ip: '127.0.0.1',
        get: vitest_1.vi.fn((string) => {
            switch (string) {
                case 'user-agent':
                    return 'fake-user-agent';
                case 'origin':
                    return 'fake-origin';
                default:
                    return null;
            }
        }),
    };
    const res = {};
    const next = vitest_1.vi.fn();
    vitest_1.vi.spyOn(emitter_1.default, 'emitFilter').mockImplementation(async (_, payload) => payload);
    await (0, authenticate_1.handler)(req, res, next);
    (0, vitest_1.expect)(req.accountability).toEqual({
        user: null,
        role: null,
        admin: false,
        app: false,
        ip: '127.0.0.1',
        userAgent: 'fake-user-agent',
        origin: 'fake-origin',
    });
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
});
(0, vitest_1.test)('Sets accountability to payload contents if valid token is passed', async () => {
    const userID = '3fac3c02-607f-4438-8d6e-6b8b25109b52';
    const roleID = '38269fc6-6eb6-475a-93cb-479d97f73039';
    const share = 'ca0ad005-f4ad-4bfe-b428-419ee8784790';
    const shareScope = {
        collection: 'articles',
        item: 15,
    };
    const appAccess = true;
    const adminAccess = false;
    const token = jsonwebtoken_1.default.sign({
        id: userID,
        role: roleID,
        app_access: appAccess,
        admin_access: adminAccess,
        share,
        share_scope: shareScope,
    }, env_1.default.SECRET, { issuer: 'directus' });
    const req = {
        ip: '127.0.0.1',
        get: vitest_1.vi.fn((string) => {
            switch (string) {
                case 'user-agent':
                    return 'fake-user-agent';
                case 'origin':
                    return 'fake-origin';
                default:
                    return null;
            }
        }),
        token,
    };
    const res = {};
    const next = vitest_1.vi.fn();
    await (0, authenticate_1.handler)(req, res, next);
    (0, vitest_1.expect)(req.accountability).toEqual({
        user: userID,
        role: roleID,
        app: appAccess,
        admin: adminAccess,
        share,
        share_scope: shareScope,
        ip: '127.0.0.1',
        userAgent: 'fake-user-agent',
        origin: 'fake-origin',
    });
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
    // Test with 1/0 instead or true/false
    next.mockClear();
    req.token = jsonwebtoken_1.default.sign({
        id: userID,
        role: roleID,
        app_access: 1,
        admin_access: 0,
        share,
        share_scope: shareScope,
    }, env_1.default.SECRET, { issuer: 'directus' });
    await (0, authenticate_1.handler)(req, res, next);
    (0, vitest_1.expect)(req.accountability).toEqual({
        user: userID,
        role: roleID,
        app: appAccess,
        admin: adminAccess,
        share,
        share_scope: shareScope,
        ip: '127.0.0.1',
        userAgent: 'fake-user-agent',
        origin: 'fake-origin',
    });
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
});
(0, vitest_1.test)('Throws InvalidCredentialsException when static token is used, but user does not exist', async () => {
    vitest_1.vi.mocked(database_1.default).mockReturnValue({
        select: vitest_1.vi.fn().mockReturnThis(),
        from: vitest_1.vi.fn().mockReturnThis(),
        leftJoin: vitest_1.vi.fn().mockReturnThis(),
        where: vitest_1.vi.fn().mockReturnThis(),
        first: vitest_1.vi.fn().mockResolvedValue(undefined),
    });
    const req = {
        ip: '127.0.0.1',
        get: vitest_1.vi.fn((string) => {
            switch (string) {
                case 'user-agent':
                    return 'fake-user-agent';
                case 'origin':
                    return 'fake-origin';
                default:
                    return null;
            }
        }),
        token: 'static-token',
    };
    const res = {};
    const next = vitest_1.vi.fn();
    (0, vitest_1.expect)((0, authenticate_1.handler)(req, res, next)).rejects.toEqual(new exceptions_1.InvalidCredentialsException());
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(0);
});
(0, vitest_1.test)('Sets accountability to user information when static token is used', async () => {
    const req = {
        ip: '127.0.0.1',
        get: vitest_1.vi.fn((string) => {
            switch (string) {
                case 'user-agent':
                    return 'fake-user-agent';
                case 'origin':
                    return 'fake-origin';
                default:
                    return null;
            }
        }),
        token: 'static-token',
    };
    const res = {};
    const next = vitest_1.vi.fn();
    const testUser = { id: 'test-id', role: 'test-role', admin_access: true, app_access: false };
    const expectedAccountability = {
        user: testUser.id,
        role: testUser.role,
        app: testUser.app_access,
        admin: testUser.admin_access,
        ip: '127.0.0.1',
        userAgent: 'fake-user-agent',
        origin: 'fake-origin',
    };
    vitest_1.vi.mocked(database_1.default).mockReturnValue({
        select: vitest_1.vi.fn().mockReturnThis(),
        from: vitest_1.vi.fn().mockReturnThis(),
        leftJoin: vitest_1.vi.fn().mockReturnThis(),
        where: vitest_1.vi.fn().mockReturnThis(),
        first: vitest_1.vi.fn().mockResolvedValue(testUser),
    });
    await (0, authenticate_1.handler)(req, res, next);
    (0, vitest_1.expect)(req.accountability).toEqual(expectedAccountability);
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
    // Test for 0 / 1 instead of false / true
    next.mockClear();
    testUser.admin_access = 1;
    testUser.app_access = 0;
    await (0, authenticate_1.handler)(req, res, next);
    (0, vitest_1.expect)(req.accountability).toEqual(expectedAccountability);
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
    // Test for "1" / "0" instead of true / false
    next.mockClear();
    testUser.admin_access = '0';
    testUser.app_access = '1';
    expectedAccountability.admin = false;
    expectedAccountability.app = true;
    await (0, authenticate_1.handler)(req, res, next);
    (0, vitest_1.expect)(req.accountability).toEqual(expectedAccountability);
    (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
});
