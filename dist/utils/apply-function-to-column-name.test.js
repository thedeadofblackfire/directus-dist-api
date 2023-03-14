"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const apply_function_to_column_name_1 = require("./apply-function-to-column-name");
vitest_1.test.each([
    { input: 'test', expected: 'test' },
    { input: 'year(date_created)', expected: 'date_created_year' },
    { input: `hour(timestamp)`, expected: 'timestamp_hour' },
    { input: `count(value)`, expected: 'value_count' },
])('should return "$expected" for "$input"', ({ input, expected }) => {
    (0, vitest_1.expect)((0, apply_function_to_column_name_1.applyFunctionToColumnName)(input)).toBe(expected);
});
