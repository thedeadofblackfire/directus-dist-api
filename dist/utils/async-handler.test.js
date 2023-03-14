"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../../src/types/express.d.ts");
const async_handler_1 = __importDefault(require("./async-handler"));
const vitest_1 = require("vitest");
let mockRequest;
let mockResponse;
const nextFunction = vitest_1.vi.fn();
(0, vitest_1.test)('Wraps async middleware in Promise resolve that will catch rejects and pass them to the nextFn', async () => {
    const err = new Error('testing');
    const middleware = async (_req, _res, _next) => {
        throw err;
    };
    await (0, async_handler_1.default)(middleware)(mockRequest, mockResponse, nextFunction);
    (0, vitest_1.expect)(nextFunction).toHaveBeenCalledWith(err);
});
