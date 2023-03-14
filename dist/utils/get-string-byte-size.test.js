"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_string_byte_size_1 = require("../../src/utils/get-string-byte-size");
const vitest_1 = require("vitest");
(0, vitest_1.test)('Returns correct byte size for given input string', () => {
    (0, vitest_1.expect)((0, get_string_byte_size_1.stringByteSize)('test')).toBe(4);
    (0, vitest_1.expect)((0, get_string_byte_size_1.stringByteSize)('🐡')).toBe(4);
    (0, vitest_1.expect)((0, get_string_byte_size_1.stringByteSize)('👨‍👧‍👦')).toBe(18);
});
