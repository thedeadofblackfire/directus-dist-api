"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vm2_1 = require("vm2");
const vitest_1 = require("vitest");
const index_1 = __importDefault(require("./index"));
(0, vitest_1.test)('Rejects when modules are used without modules being allowed', async () => {
    const testCode = `
		const test = require('test');
	`;
    await (0, vitest_1.expect)(index_1.default.handler({ code: testCode }, {
        data: {},
        env: {
            FLOWS_EXEC_ALLOWED_MODULES: '',
        },
    })).rejects.toEqual(new vm2_1.VMError("Cannot find module 'test'"));
});
(0, vitest_1.test)('Rejects when code contains syntax errors', async () => {
    const testCode = `
		~~
	`;
    await (0, vitest_1.expect)(index_1.default.handler({ code: testCode }, {
        data: {},
        env: {
            FLOWS_EXEC_ALLOWED_MODULES: '',
        },
    })).rejects.toEqual(new SyntaxError('Unexpected end of input'));
});
(0, vitest_1.test)('Rejects when returned function does something illegal', async () => {
    const testCode = `
		module.exports = function() {
			return a + b;
		};
	`;
    await (0, vitest_1.expect)(index_1.default.handler({ code: testCode }, {
        data: {},
        env: {
            FLOWS_EXEC_ALLOWED_MODULES: '',
        },
    })).rejects.toEqual(new ReferenceError('a is not defined'));
});
(0, vitest_1.test)("Rejects when code doesn't return valid function", async () => {
    const testCode = `
		module.exports = false;
	`;
    await (0, vitest_1.expect)(index_1.default.handler({ code: testCode }, {
        data: {},
        env: {
            FLOWS_EXEC_ALLOWED_MODULES: '',
        },
    })).rejects.toEqual(new TypeError('fn is not a function'));
});
(0, vitest_1.test)('Rejects returned function throws errors', async () => {
    const testCode = `
		module.exports = function () {
			throw new Error('test');
		};
	`;
    await (0, vitest_1.expect)(index_1.default.handler({ code: testCode }, {
        data: {},
        env: {
            FLOWS_EXEC_ALLOWED_MODULES: '',
        },
    })).rejects.toEqual(new Error('test'));
});
(0, vitest_1.test)('Executes function when valid', () => {
    const testCode = `
		module.exports = function (data) {
			return { result: data.input + ' test' };
		};
	`;
    (0, vitest_1.expect)(index_1.default.handler({ code: testCode }, {
        data: {
            input: 'start',
        },
        env: {
            FLOWS_EXEC_ALLOWED_MODULES: '',
        },
    })).resolves.toEqual({ result: 'start test' });
});
(0, vitest_1.test)('Allows modules that are whitelisted', () => {
    const testCode = `
		const bytes = require('bytes');

		module.exports = function (data) {
			return { result: bytes(1000) };
		};
	`;
    (0, vitest_1.expect)(index_1.default.handler({ code: testCode }, {
        data: {},
        env: {
            FLOWS_EXEC_ALLOWED_MODULES: 'bytes',
        },
    })).resolves.toEqual({ result: '1000B' });
});
