"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const apply_diff_1 = require("./apply-diff");
(0, vitest_1.describe)('isNestedMetaUpdate', () => {
    vitest_1.it.each([
        { kind: 'E', path: ['meta', 'options', 'option_a'], rhs: {} },
        { kind: 'A', path: ['meta', 'options', 'option_a'], rhs: [] },
    ])('Returns false when diff is kind $kind', (diff) => {
        (0, vitest_1.expect)((0, apply_diff_1.isNestedMetaUpdate)(diff)).toBe(false);
    });
    vitest_1.it.each([
        { kind: 'N', path: ['schema', 'default_value'], rhs: {} },
        { kind: 'D', path: ['schema'], lhs: {} },
    ])('Returns false when diff path is not nested in meta', (diff) => {
        (0, vitest_1.expect)((0, apply_diff_1.isNestedMetaUpdate)(diff)).toBe(false);
    });
    vitest_1.it.each([
        { kind: 'N', path: ['meta', 'options', 'option_a'], rhs: { test: 'value' } },
        { kind: 'D', path: ['meta', 'options', 'option_b'], lhs: {} },
    ])('Returns true when diff path is nested in meta', (diff) => {
        (0, vitest_1.expect)((0, apply_diff_1.isNestedMetaUpdate)(diff)).toBe(true);
    });
});
