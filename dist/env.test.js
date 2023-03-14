"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const testEnv = {
    NUMBER: '1234',
    NUMBER_CAST_AS_STRING: 'string:1234',
    REGEX: 'regex:\\.example\\.com$',
    CSV: 'one,two,three,four',
    CSV_CAST_AS_STRING: 'string:one,two,three,four',
    MULTIPLE: 'array:string:https://example.com,regex:\\.example2\\.com$',
};
(0, vitest_1.describe)('env processed values', async () => {
    process.env = { ...testEnv };
    const env = (await vitest_1.vi.importActual('../src/env')).default;
    (0, vitest_1.test)('Number value should be a number', () => {
        (0, vitest_1.expect)(env.NUMBER).toStrictEqual(1234);
    });
    (0, vitest_1.test)('Number value casted as string should be a string', () => {
        (0, vitest_1.expect)(env.NUMBER_CAST_AS_STRING).toStrictEqual('1234');
    });
    (0, vitest_1.test)('Value casted as regex', () => {
        (0, vitest_1.expect)(env.REGEX).toBeInstanceOf(RegExp);
    });
    (0, vitest_1.test)('CSV value should be an array', () => {
        (0, vitest_1.expect)(env.CSV).toStrictEqual(['one', 'two', 'three', 'four']);
    });
    (0, vitest_1.test)('CSV value casted as string should be a string', () => {
        (0, vitest_1.expect)(env.CSV_CAST_AS_STRING).toStrictEqual('one,two,three,four');
    });
    (0, vitest_1.test)('Multiple type cast', () => {
        (0, vitest_1.expect)(env.MULTIPLE).toStrictEqual(['https://example.com', /\.example2\.com$/]);
    });
});
