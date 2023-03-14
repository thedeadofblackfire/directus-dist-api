"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = __importDefault(require("./index"));
(0, vitest_1.test)('runs the same object as the input', async () => {
    const json = { test: 'item' };
    const result = await index_1.default.handler({ json }, {});
    (0, vitest_1.expect)(result).toEqual(json);
});
(0, vitest_1.test)('runs parsed JSON for stringified JSON input', async () => {
    const json = '{"test":"item"}';
    const result = await index_1.default.handler({ json }, {});
    (0, vitest_1.expect)(result).toEqual({ test: 'item' });
});
