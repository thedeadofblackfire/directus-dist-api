"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const get_milliseconds_1 = require("./get-milliseconds");
vitest_1.test.each([
    // accept human readable time format and plain number
    ['1d', 86400000],
    ['1000', 1000],
    [1000, 1000],
    // accept negative values
    ['-1 minutes', -60000],
    [-1, -1],
    [0, 0],
    // fallback to undefined
    [null, undefined],
    [undefined, undefined],
    ['', undefined],
    ['invalid string', undefined],
    [false, undefined],
    [[], undefined],
    [{}, undefined],
    [Symbol(123), undefined],
    [
        () => {
            return 456;
        },
        undefined,
    ],
])('should result into %s for input "%s"', (input, expected) => {
    (0, vitest_1.expect)((0, get_milliseconds_1.getMilliseconds)(input)).toBe(expected);
});
(0, vitest_1.test)('should return custom fallback on invalid value', () => {
    (0, vitest_1.expect)((0, get_milliseconds_1.getMilliseconds)(undefined, 0)).toBe(0);
});
