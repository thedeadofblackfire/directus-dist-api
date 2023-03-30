"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const exceptions_1 = require("@directus/shared/exceptions");
const utils_1 = require("@directus/shared/utils");
const database_1 = __importDefault(require("../database"));
const emitter_1 = __importDefault(require("../emitter"));
const env_1 = __importDefault(require("../env"));
const exceptions_2 = require("../exceptions");
const logger_1 = __importDefault(require("../logger"));
// Note: keep all 4 parameters here. That's how Express recognizes it's the error handler, even if
// we don't use next
const errorHandler = (err, req, res, _next) => {
    let payload = {
        errors: [],
    };
    const errors = (0, utils_1.toArray)(err);
    if (errors.some((err) => err instanceof exceptions_1.BaseException === false)) {
        res.status(500);
    }
    else {
        let status = errors[0].status;
        for (const err of errors) {
            if (status !== err.status) {
                // If there's multiple different status codes in the errors, use 500
                status = 500;
                break;
            }
        }
        res.status(status);
    }
    for (const err of errors) {
        if (env_1.default['NODE_ENV'] === 'development') {
            err.extensions = {
                ...(err.extensions || {}),
                stack: err.stack,
            };
        }
        if (err instanceof exceptions_1.BaseException) {
            logger_1.default.debug(err);
            res.status(err.status);
            payload.errors.push({
                message: err.message,
                extensions: {
                    code: err.code,
                    ...err.extensions,
                },
            });
            if (err instanceof exceptions_2.MethodNotAllowedException) {
                res.header('Allow', err.extensions['allow'].join(', '));
            }
        }
        else {
            logger_1.default.error(err);
            res.status(500);
            if (req.accountability?.admin === true) {
                payload = {
                    errors: [
                        {
                            message: err.message,
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                ...err.extensions,
                            },
                        },
                    ],
                };
            }
            else {
                payload = {
                    errors: [
                        {
                            message: 'An unexpected error occurred.',
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                            },
                        },
                    ],
                };
            }
        }
    }
    emitter_1.default
        .emitFilter('request.error', payload.errors, {}, {
        database: (0, database_1.default)(),
        schema: req.schema,
        accountability: req.accountability ?? null,
    })
        .then(() => {
        return res.json(payload);
    });
};
exports.default = errorHandler;
