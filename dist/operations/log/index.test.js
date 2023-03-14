"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const loggerInfo = vitest_1.vi.fn();
vitest_1.vi.mock('../../logger', () => ({
    default: {
        info: loggerInfo,
    },
}));
const index_1 = __importDefault(require("./index"));
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.test)('logs number message as string', () => {
    const message = 1;
    index_1.default.handler({ message }, {});
    (0, vitest_1.expect)(loggerInfo).toHaveBeenCalledWith(String(1));
});
(0, vitest_1.test)('logs json message as stringified json', () => {
    const message = { test: 'message' };
    index_1.default.handler({ message }, {});
    (0, vitest_1.expect)(loggerInfo).toHaveBeenCalledWith(JSON.stringify(message));
});
