"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const md_1 = require("./md");
vitest_1.test.each([
    { str: 'test', expected: '<p>test</p>\n' },
    { str: `<a href="/test" download />`, expected: '<a href="/test"></a>' },
    { str: `test<script>alert('alert')</script>`, expected: '<p>test</p>\n' },
])('should sanitize "$str" into "$expected"', ({ str, expected }) => {
    (0, vitest_1.expect)((0, md_1.md)(str)).toBe(expected);
});
