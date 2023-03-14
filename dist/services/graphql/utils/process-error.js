"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../../logger"));
const exceptions_1 = require("@directus/shared/exceptions");
const processError = (accountability, error) => {
    logger_1.default.error(error);
    const { originalError } = error;
    if (originalError instanceof exceptions_1.BaseException) {
        return {
            message: originalError.message,
            extensions: {
                code: originalError.code,
                ...originalError.extensions,
            },
        };
    }
    else {
        if ((accountability === null || accountability === void 0 ? void 0 : accountability.admin) === true) {
            return {
                ...error,
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                },
            };
        }
        else {
            return {
                message: 'An unexpected error occurred.',
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                },
            };
        }
    }
};
exports.default = processError;
