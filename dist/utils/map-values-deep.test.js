"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const map_values_deep_1 = require("./map-values-deep");
(0, vitest_1.test)('Replace all undefined values with null', () => {
    const obj = { a: { b: { c: undefined } }, b: 'test' };
    const result = (0, map_values_deep_1.mapValuesDeep)(obj, (_, value) => (value === undefined ? null : value));
    (0, vitest_1.expect)(result).toEqual({ a: { b: { c: null } }, b: 'test' });
});
(0, vitest_1.test)('Set all values to "Hi" with a key of "b.c"', () => {
    const obj = { a: { b: { c: undefined } }, b: { a: 'test', c: 'test' }, 'b.c': 'test' };
    const result = (0, map_values_deep_1.mapValuesDeep)(obj, (key, value) => (key === 'b.c' ? 'Hi' : value));
    (0, vitest_1.expect)(result).toEqual({ a: { b: { c: undefined } }, b: { a: 'test', c: 'Hi' }, 'b.c': 'Hi' });
});
(0, vitest_1.test)('Make sure arrays are propperly mapped', () => {
    const obj = { a: [undefined, 'test'] };
    const result = (0, map_values_deep_1.mapValuesDeep)(obj, (_, value) => (value === undefined ? null : value));
    (0, vitest_1.expect)(result).toEqual({ a: [null, 'test'] });
});
(0, vitest_1.test)('Set all 2nd indices of arrays to "Hi"', () => {
    const obj = { a: [undefined, 'test', { a: ['hello', 'world'] }], b: ['test'] };
    const result = (0, map_values_deep_1.mapValuesDeep)(obj, (key, value) => (key.endsWith('a[1]') ? 'Hi' : value));
    (0, vitest_1.expect)(result).toEqual({ a: [undefined, 'Hi', { a: ['hello', 'Hi'] }], b: ['test'] });
});
