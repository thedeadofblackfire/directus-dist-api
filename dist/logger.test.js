"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const REFRESH_TOKEN_COOKIE_NAME = 'directus_refresh_token';
vitest_1.vi.mock('./env', async () => {
    const MOCK_ENV = {
        AUTH_PROVIDERS: 'ranger,monospace',
        AUTH_RANGER_DRIVER: 'oauth2',
        AUTH_MONOSPACE_DRIVER: 'openid',
        REFRESH_TOKEN_COOKIE_NAME,
        LOG_LEVEL: 'info',
        LOG_STYLE: 'raw',
    };
    return {
        default: MOCK_ENV,
        getEnv: () => MOCK_ENV,
    };
});
const node_stream_1 = require("node:stream");
const pino_1 = __importDefault(require("pino"));
const constants_1 = require("./constants");
const logger_1 = require("./logger");
const logOutput = vitest_1.vi.fn();
let stream;
(0, vitest_1.beforeEach)(() => {
    stream = new node_stream_1.Writable({
        write(chunk) {
            logOutput(JSON.parse(chunk.toString()));
        },
    });
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.describe)('req.headers.authorization', () => {
    (0, vitest_1.test)('Should redact bearer token in Authorization header', () => {
        const instance = (0, pino_1.default)(logger_1.httpLoggerOptions, stream);
        instance.info({
            req: {
                headers: {
                    authorization: `Bearer test-access-token-value`,
                },
            },
        });
        (0, vitest_1.expect)(logOutput.mock.calls[0][0]).toMatchObject({
            req: {
                headers: {
                    authorization: constants_1.REDACT_TEXT,
                },
            },
        });
    });
});
(0, vitest_1.describe)('req.headers.cookie', () => {
    (0, vitest_1.test)('Should redact refresh token when there is only one entry', () => {
        const instance = (0, pino_1.default)(logger_1.httpLoggerOptions, stream);
        instance.info({
            req: {
                headers: {
                    cookie: `${REFRESH_TOKEN_COOKIE_NAME}=test-refresh-token-value`,
                },
            },
        });
        (0, vitest_1.expect)(logOutput.mock.calls[0][0]).toMatchObject({
            req: {
                headers: {
                    cookie: constants_1.REDACT_TEXT,
                },
            },
        });
    });
    (0, vitest_1.test)('Should redact refresh token with multiple entries', () => {
        const instance = (0, pino_1.default)(logger_1.httpLoggerOptions, stream);
        instance.info({
            req: {
                headers: {
                    cookie: `custom_test_cookie=custom_test_value; access_token=test-access-token-value; oauth2.ranger=test-oauth2-value; openid.monospace=test-openid-value; ${REFRESH_TOKEN_COOKIE_NAME}=test-refresh-token-value`,
                },
            },
        });
        (0, vitest_1.expect)(logOutput.mock.calls[0][0]).toMatchObject({
            req: {
                headers: {
                    cookie: constants_1.REDACT_TEXT,
                },
            },
        });
    });
});
(0, vitest_1.describe)('res.headers', () => {
    (0, vitest_1.test)('Should redact refresh token when there is only one entry', () => {
        const instance = (0, pino_1.default)(logger_1.httpLoggerOptions, stream);
        instance.info({
            res: {
                headers: {
                    'set-cookie': `${REFRESH_TOKEN_COOKIE_NAME}=test-refresh-token-value; Max-Age=604800; Path=/; Expires=Tue, 14 Feb 2023 12:00:00 GMT; HttpOnly; SameSite=Lax`,
                },
            },
        });
        (0, vitest_1.expect)(logOutput.mock.calls[0][0]).toMatchObject({
            res: {
                headers: {
                    'set-cookie': constants_1.REDACT_TEXT,
                },
            },
        });
    });
    (0, vitest_1.test)('Should redact refresh token with multiple entries', () => {
        const instance = (0, pino_1.default)(logger_1.httpLoggerOptions, stream);
        instance.info({
            res: {
                headers: {
                    'set-cookie': [
                        `access_token=test-access-token-value; Max-Age=604800; Path=/; Expires=Tue, 14 Feb 2023 12:00:00 GMT; HttpOnly; SameSite=Lax`,
                        `oauth2.ranger=test-oauth2-value; Max-Age=604800; Path=/; Expires=Tue, 14 Feb 2023 12:00:00 GMT; HttpOnly; SameSite=Lax`,
                        `openid.monospace=test-openid-value; Max-Age=604800; Path=/; Expires=Tue, 14 Feb 2023 12:00:00 GMT; HttpOnly; SameSite=Lax`,
                        `${REFRESH_TOKEN_COOKIE_NAME}=test-refresh-token-value; Max-Age=604800; Path=/; Expires=Tue, 14 Feb 2023 12:00:00 GMT; HttpOnly; SameSite=Lax`,
                    ],
                },
            },
        });
        (0, vitest_1.expect)(logOutput.mock.calls[0][0]).toMatchObject({
            res: {
                headers: {
                    'set-cookie': constants_1.REDACT_TEXT,
                },
            },
        });
    });
});
