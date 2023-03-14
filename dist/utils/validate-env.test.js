"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validate_env_1 = require("./validate-env");
const logger_1 = __importDefault(require("../logger"));
vitest_1.vi.mock('../env', () => ({
    getEnv: vitest_1.vi.fn().mockReturnValue({
        PRESENT_TEST_VARIABLE: true,
    }),
}));
vitest_1.vi.mock('../logger', () => ({
    default: {
        error: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('process', () => ({
    exit: vitest_1.vi.fn(),
}));
(0, vitest_1.beforeAll)(() => {
    vitest_1.vi.spyOn(process, 'exit').mockImplementation(() => undefined);
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.test)('should not have any error when key is present', () => {
    (0, validate_env_1.validateEnv)(['PRESENT_TEST_VARIABLE']);
    (0, vitest_1.expect)(logger_1.default.error).not.toHaveBeenCalled();
    (0, vitest_1.expect)(process.exit).not.toHaveBeenCalled();
});
(0, vitest_1.test)('should have error when key is missing', () => {
    (0, validate_env_1.validateEnv)(['ABSENT_TEST_VARIABLE']);
    (0, vitest_1.expect)(logger_1.default.error).toHaveBeenCalled();
    (0, vitest_1.expect)(process.exit).toHaveBeenCalled();
});
