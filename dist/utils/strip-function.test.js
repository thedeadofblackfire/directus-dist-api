"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const strip_function_1 = require("./strip-function");
vitest_1.test.each([
    { field: 'year(date_created)', expected: 'date_created' },
    { field: 'test', expected: 'test' },
])('should return "$expected" for "$field"', ({ field, expected }) => {
    (0, vitest_1.expect)((0, strip_function_1.stripFunction)(field)).toBe(expected);
});
