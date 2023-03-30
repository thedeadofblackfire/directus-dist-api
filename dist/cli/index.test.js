"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
const index_1 = require("./index");
vitest_1.vi.mock('../../src/env', async () => {
    const actual = (await vitest_1.vi.importActual('../../src/env'));
    const MOCK_ENV = {
        ...actual.default,
        EXTENSIONS_PATH: '',
        SERVE_APP: false,
        DB_CLIENT: 'pg',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_DATABASE: 'directus',
        DB_USER: 'postgres',
        DB_PASSWORD: 'psql1234',
    };
    return {
        default: MOCK_ENV,
        getEnv: () => MOCK_ENV,
    };
});
vitest_1.vi.mock('@directus/shared/utils/node', async () => {
    const actual = await vitest_1.vi.importActual('@directus/shared/utils/node');
    const customCliExtension = {
        path: '/hooks/custom-cli',
        name: 'custom-cli',
        type: 'hook',
        entrypoint: 'index.js',
        local: true,
    };
    return {
        ...actual,
        getPackageExtensions: vitest_1.vi.fn(() => Promise.resolve([])),
        getLocalExtensions: vitest_1.vi.fn(() => Promise.resolve([customCliExtension])),
    };
});
const beforeHook = vitest_1.vi.fn();
const afterAction = vitest_1.vi.fn();
const afterHook = vitest_1.vi.fn(({ program }) => {
    program.command('custom').action(afterAction);
});
const customCliHook = ({ init }) => {
    init('cli.before', beforeHook);
    init('cli.after', afterHook);
};
vitest_1.vi.mock(path_1.default.resolve('/hooks/custom-cli', 'index.js'), () => ({
    default: customCliHook,
}));
const writeOut = vitest_1.vi.fn();
const writeErr = vitest_1.vi.fn();
const setup = async () => {
    const program = await (0, index_1.createCli)();
    program.exitOverride();
    program.configureOutput({ writeOut, writeErr });
    return program;
};
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.describe)('cli hooks', () => {
    (0, vitest_1.test)('should call hooks before and after creating the cli', async () => {
        const program = await setup();
        (0, vitest_1.expect)(beforeHook).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(beforeHook).toHaveBeenCalledWith({ event: 'cli.before', program });
        (0, vitest_1.expect)(afterHook).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(afterHook).toHaveBeenCalledWith({ event: 'cli.after', program });
    });
    (0, vitest_1.test)('should be able to add a custom cli command', async () => {
        const program = await setup();
        program.parseAsync(['custom'], { from: 'user' });
        (0, vitest_1.expect)(afterAction).toHaveBeenCalledTimes(1);
    });
});
