"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = __importDefault(require("./index"));
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.useFakeTimers();
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.useRealTimers();
});
(0, vitest_1.test)('promise resolves after the configured duration in milliseconds', () => {
    const milliseconds = 1000;
    // asserts there is no timer (setTimeout) running yet
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(0);
    // intentionally don't await to assert the timer
    index_1.default.handler({ milliseconds }, {});
    // asserts there is 1 timer (setTimeout) running now
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(1);
    vitest_1.vi.advanceTimersByTime(milliseconds);
    // asserts there is no longer any timer (setTimeout) running
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(0);
});
(0, vitest_1.test)('casts string input for milliseconds to number', () => {
    const milliseconds = '1000';
    // asserts there is no timer (setTimeout) running yet
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(0);
    // intentionally don't await to assert the timer
    index_1.default.handler({ milliseconds }, {});
    // asserts there is 1 timer (setTimeout) running now
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(1);
    vitest_1.vi.advanceTimersByTime(Number(milliseconds));
    // asserts there is no longer any timer (setTimeout) running
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(0);
});
