"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expressLogger = void 0;
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importStar(require("pino-http"));
const get_config_from_env_1 = require("./utils/get-config-from-env");
const url_1 = require("url");
const env_1 = __importDefault(require("./env"));
const utils_1 = require("@directus/shared/utils");
const lodash_1 = require("lodash");
const pinoOptions = {
    level: env_1.default.LOG_LEVEL || 'info',
    redact: {
        paths: ['req.headers.authorization', `req.cookies.${env_1.default.REFRESH_TOKEN_COOKIE_NAME}`],
        censor: '--redact--',
    },
};
const httpLoggerOptions = {
    level: env_1.default.LOG_LEVEL || 'info',
    redact: {
        paths: ['req.headers.authorization', `req.cookies.${env_1.default.REFRESH_TOKEN_COOKIE_NAME}`],
        censor: '--redact--',
    },
};
if (env_1.default.LOG_STYLE !== 'raw') {
    pinoOptions.transport = {
        target: 'pino-pretty',
        options: {
            ignore: 'hostname,pid',
            sync: true,
        },
    };
    httpLoggerOptions.transport = {
        target: 'pino-http-print',
        options: {
            all: true,
            translateTime: 'SYS:HH:MM:ss',
            relativeUrl: true,
            prettyOptions: {
                ignore: 'hostname,pid',
                sync: true,
            },
        },
    };
}
const loggerEnvConfig = (0, get_config_from_env_1.getConfigFromEnv)('LOGGER_', 'LOGGER_HTTP');
// Expose custom log levels into formatter function
if (loggerEnvConfig.levels) {
    const customLogLevels = {};
    for (const el of (0, utils_1.toArray)(loggerEnvConfig.levels)) {
        const key_val = el.split(':');
        customLogLevels[key_val[0].trim()] = key_val[1].trim();
    }
    pinoOptions.formatters = {
        level(label, number) {
            return {
                severity: customLogLevels[label] || 'info',
                level: number,
            };
        },
    };
    httpLoggerOptions.formatters = {
        level(label, number) {
            return {
                severity: customLogLevels[label] || 'info',
                level: number,
            };
        },
    };
    delete loggerEnvConfig.levels;
}
const logger = (0, pino_1.default)((0, lodash_1.merge)(pinoOptions, loggerEnvConfig));
const httpLoggerEnvConfig = (0, get_config_from_env_1.getConfigFromEnv)('LOGGER_HTTP', ['LOGGER_HTTP_LOGGER']);
exports.expressLogger = (0, pino_http_1.default)({
    logger: (0, pino_1.default)((0, lodash_1.merge)(httpLoggerOptions, loggerEnvConfig)),
    ...httpLoggerEnvConfig,
    serializers: {
        req(request) {
            const output = pino_http_1.stdSerializers.req(request);
            output.url = redactQuery(output.url);
            return output;
        },
    },
});
exports.default = logger;
function redactQuery(originalPath) {
    const url = new url_1.URL(originalPath, 'http://example.com/');
    if (url.searchParams.has('access_token')) {
        url.searchParams.set('access_token', '--redacted--');
    }
    return url.pathname + url.search;
}
