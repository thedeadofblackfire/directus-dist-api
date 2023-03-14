"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = __importDefault(require("./app"));
vitest_1.vi.mock('./database', () => ({
    default: vitest_1.vi.fn(),
    getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres'),
    isInstalled: vitest_1.vi.fn(),
    validateDatabaseConnection: vitest_1.vi.fn(),
    validateDatabaseExtensions: vitest_1.vi.fn(),
    validateMigrations: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./env', async () => {
    const actual = (await vitest_1.vi.importActual('./env'));
    const MOCK_ENV = {
        ...actual.default,
        KEY: 'xxxxxxx-xxxxxx-xxxxxxxx-xxxxxxxxxx',
        SECRET: 'abcdef',
        SERVE_APP: true,
        PUBLIC_URL: 'http://localhost:8055/directus',
        TELEMETRY: false,
        LOG_STYLE: 'raw',
    };
    return {
        default: MOCK_ENV,
        getEnv: () => MOCK_ENV,
    };
});
const mockGetEndpointRouter = vitest_1.vi.fn().mockReturnValue((0, express_1.Router)());
const mockGetEmbeds = vitest_1.vi.fn().mockReturnValue({ head: '', body: '' });
vitest_1.vi.mock('./extensions', () => ({
    getExtensionManager: vitest_1.vi.fn().mockImplementation(() => {
        return {
            initialize: vitest_1.vi.fn(),
            getEndpointRouter: mockGetEndpointRouter,
            getEmbeds: mockGetEmbeds,
        };
    }),
}));
vitest_1.vi.mock('./flows', () => ({
    getFlowManager: vitest_1.vi.fn().mockImplementation(() => {
        return {
            initialize: vitest_1.vi.fn(),
        };
    }),
}));
vitest_1.vi.mock('./middleware/check-ip', () => ({
    checkIP: (0, express_1.Router)(),
}));
vitest_1.vi.mock('./middleware/schema', () => ({
    default: (0, express_1.Router)(),
}));
vitest_1.vi.mock('./middleware/get-permissions', () => ({
    default: (0, express_1.Router)(),
}));
vitest_1.vi.mock('./auth', () => ({
    registerAuthProviders: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./webhooks', () => ({
    init: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('createApp', async () => {
    (0, vitest_1.describe)('Content Security Policy', () => {
        (0, vitest_1.test)('Should set content-security-policy header by default', async () => {
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/');
            (0, vitest_1.expect)(response.headers).toHaveProperty('content-security-policy');
        });
    });
    (0, vitest_1.describe)('Root Redirect', () => {
        (0, vitest_1.test)('Should redirect root path by default', async () => {
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/');
            (0, vitest_1.expect)(response.status).toEqual(302);
        });
    });
    (0, vitest_1.describe)('robots.txt file', () => {
        (0, vitest_1.test)('Should respond with default robots.txt content', async () => {
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/robots.txt');
            (0, vitest_1.expect)(response.text).toEqual('User-agent: *\nDisallow: /');
        });
    });
    (0, vitest_1.describe)('Admin App', () => {
        (0, vitest_1.test)('Should set <base /> tag href to public url with admin relative path', async () => {
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/admin');
            (0, vitest_1.expect)(response.text).toEqual(vitest_1.expect.stringContaining(`<base href="/directus/admin/" />`));
        });
        (0, vitest_1.test)('Should remove <embed-head /> and <embed-body /> tags when there are no custom embeds', async () => {
            mockGetEmbeds.mockReturnValueOnce({ head: '', body: '' });
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/admin');
            (0, vitest_1.expect)(response.text).not.toEqual(vitest_1.expect.stringContaining(`<embed-head />`));
            (0, vitest_1.expect)(response.text).not.toEqual(vitest_1.expect.stringContaining(`<embed-body />`));
        });
        (0, vitest_1.test)('Should replace <embed-head /> tag with custom embed head', async () => {
            const mockEmbedHead = '<!-- Test Embed Head -->';
            mockGetEmbeds.mockReturnValueOnce({ head: mockEmbedHead, body: '' });
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/admin');
            (0, vitest_1.expect)(response.text).toEqual(vitest_1.expect.stringContaining(mockEmbedHead));
        });
        (0, vitest_1.test)('Should replace <embed-body /> tag with custom embed body', async () => {
            const mockEmbedBody = '<!-- Test Embed Body -->';
            mockGetEmbeds.mockReturnValueOnce({ head: '', body: mockEmbedBody });
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/admin');
            (0, vitest_1.expect)(response.text).toEqual(vitest_1.expect.stringContaining(mockEmbedBody));
        });
    });
    (0, vitest_1.describe)('Server ping endpoint', () => {
        (0, vitest_1.test)('Should respond with pong', async () => {
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get('/server/ping');
            (0, vitest_1.expect)(response.text).toEqual('pong');
        });
    });
    (0, vitest_1.describe)('Custom Endpoints', () => {
        (0, vitest_1.test)('Should not contain route for custom endpoint', async () => {
            const testRoute = '/custom-endpoint-to-test';
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get(testRoute);
            (0, vitest_1.expect)(response.body).toEqual({
                errors: [
                    {
                        extensions: {
                            code: 'ROUTE_NOT_FOUND',
                        },
                        message: `Route ${testRoute} doesn't exist.`,
                    },
                ],
            });
        });
        (0, vitest_1.test)('Should contain route for custom endpoint', async () => {
            const testRoute = '/custom-endpoint-to-test';
            const testResponse = { key: 'value' };
            const mockRouter = (0, express_1.Router)();
            mockRouter.use(testRoute, (_, res) => {
                res.json(testResponse);
            });
            mockGetEndpointRouter.mockReturnValueOnce(mockRouter);
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get(testRoute);
            (0, vitest_1.expect)(response.body).toEqual(testResponse);
        });
    });
    (0, vitest_1.describe)('Not Found Handler', () => {
        (0, vitest_1.test)('Should return ROUTE_NOT_FOUND error when a route does not exist', async () => {
            const testRoute = '/this-route-does-not-exist';
            const app = await (0, app_1.default)();
            const response = await (0, supertest_1.default)(app).get(testRoute);
            (0, vitest_1.expect)(response.body).toEqual({
                errors: [
                    {
                        extensions: {
                            code: 'ROUTE_NOT_FOUND',
                        },
                        message: `Route ${testRoute} doesn't exist.`,
                    },
                ],
            });
        });
    });
});
