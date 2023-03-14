"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const user_name_1 = require("./user-name");
const unknownUser = 'Unknown User';
(0, vitest_1.test)('should return "Unknown User" when user is undefined', () => {
    (0, vitest_1.expect)((0, user_name_1.userName)(undefined)).toBe(unknownUser);
});
(0, vitest_1.test)('should return "Test User" when user first name is "Test" and last name is "User"', () => {
    (0, vitest_1.expect)((0, user_name_1.userName)({ first_name: 'Test', last_name: 'User' })).toBe('Test User');
});
(0, vitest_1.test)('should return "Test" when user first name is "Test" but does not have last name', () => {
    (0, vitest_1.expect)((0, user_name_1.userName)({ first_name: 'Test' })).toBe('Test');
});
(0, vitest_1.test)('should return user email when user only has email without first name and last name', () => {
    (0, vitest_1.expect)((0, user_name_1.userName)({ email: 'test@example.com' })).toBe('test@example.com');
});
(0, vitest_1.test)('should return "Unknown User" when user is empty', () => {
    (0, vitest_1.expect)((0, user_name_1.userName)({})).toBe(unknownUser);
});
