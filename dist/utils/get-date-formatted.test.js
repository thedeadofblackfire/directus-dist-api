"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const get_date_formatted_1 = require("./get-date-formatted");
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.useFakeTimers();
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.useRealTimers();
});
function getUtcDateForString(date) {
    const now = new Date(date);
    // account for timezone difference depending on the machine where this test is ran
    const timezoneOffsetInMinutes = now.getTimezoneOffset();
    const timezoneOffsetInMilliseconds = timezoneOffsetInMinutes * 60 * 1000;
    const nowUTC = new Date(now.valueOf() + timezoneOffsetInMilliseconds);
    return nowUTC;
}
vitest_1.test.each([
    { utc: '2023-01-01T01:23:45.678Z', expected: '20230101-12345' },
    { utc: '2023-01-11T01:23:45.678Z', expected: '20230111-12345' },
    { utc: '2023-11-01T01:23:45.678Z', expected: '20231101-12345' },
    { utc: '2023-11-11T12:34:56.789Z', expected: '20231111-123456' },
    { utc: '2023-06-01T01:23:45.678Z', expected: '20230601-12345' },
    { utc: '2023-06-11T12:34:56.789Z', expected: '20230611-123456' },
])('should format $utc into "$expected"', ({ utc, expected }) => {
    const nowUTC = getUtcDateForString(utc);
    vitest_1.vi.setSystemTime(nowUTC);
    (0, vitest_1.expect)((0, get_date_formatted_1.getDateFormatted)()).toBe(expected);
});
