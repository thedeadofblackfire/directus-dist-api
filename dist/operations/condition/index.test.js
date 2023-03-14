"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = __importDefault(require("./index"));
(0, vitest_1.describe)('Operations / Condition', () => {
    (0, vitest_1.test)('returns null when condition passes', () => {
        const filter = {
            status: {
                _eq: true,
            },
        };
        const data = {
            status: true,
        };
        (0, vitest_1.expect)(index_1.default.handler({ filter }, { data })).toBe(null);
    });
    (0, vitest_1.test)('throws error array when conditions fails', () => {
        const filter = {
            status: {
                _eq: true,
            },
        };
        const data = {
            status: false,
        };
        vitest_1.expect.assertions(2); // ensure catch block is reached
        try {
            index_1.default.handler({ filter }, { data });
        }
        catch (err) {
            (0, vitest_1.expect)(err).toHaveLength(1);
            (0, vitest_1.expect)(err[0].message).toBe(`"status" must be [true]`);
        }
    });
    (0, vitest_1.test)('throws error array when condition is checking for a field that is not included in data', () => {
        const filter = {
            status: {
                _eq: true,
            },
        };
        const data = {};
        vitest_1.expect.assertions(2); // ensure catch block is reached
        try {
            index_1.default.handler({ filter }, { data });
        }
        catch (err) {
            (0, vitest_1.expect)(err).toHaveLength(1);
            (0, vitest_1.expect)(err[0].message).toBe(`"status" is required`);
        }
    });
});
