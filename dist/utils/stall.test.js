"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const stall_1 = require("./stall");
let performanceNowSpy;
(0, vitest_1.beforeAll)(() => {
    vitest_1.vi.useFakeTimers();
    // fake timers doesn't fake performance.now(), so this is used to mock it
    performanceNowSpy = vitest_1.vi.spyOn(performance, 'now').mockReturnValue(0);
});
(0, vitest_1.afterAll)(() => {
    vitest_1.vi.useRealTimers();
});
const STALL_TIME = 100;
(0, vitest_1.test)('does not stall if elapsed time has already past the stall time', () => {
    const startTime = performance.now();
    // intentionally advance past the stall time first
    performanceNowSpy.mockReturnValueOnce(1000);
    (0, stall_1.stall)(STALL_TIME, startTime);
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(0);
});
(0, vitest_1.test)('should stall for a set amount of time', () => {
    const startTime = performance.now();
    (0, stall_1.stall)(STALL_TIME, startTime);
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(1);
    vitest_1.vi.advanceTimersByTime(STALL_TIME);
    (0, vitest_1.expect)(vitest_1.vi.getTimerCount()).toBe(0);
});
