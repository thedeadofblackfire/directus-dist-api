"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const exceptions_1 = require("@directus/shared/exceptions");
const logger_1 = __importDefault(require("../../../logger"));
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
        if (accountability?.admin === true) {
            const graphqlFormattedError = {
                message: error.message,
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                },
            };
            if (error.locations) {
                graphqlFormattedError.locations = error.locations;
            }
            if (error.path) {
                graphqlFormattedError.path = error.path;
            }
            return graphqlFormattedError;
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
