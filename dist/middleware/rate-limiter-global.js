"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiterGlobal = void 0;
const ms_1 = __importDefault(require("ms"));
const env_1 = __importDefault(require("../env"));
const index_1 = require("../exceptions/index");
const logger_1 = __importDefault(require("../logger"));
const rate_limiter_1 = require("../rate-limiter");
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const validate_env_1 = require("../utils/validate-env");
const RATE_LIMITER_GLOBAL_KEY = 'global-rate-limit';
let checkRateLimit = (_req, _res, next) => next();
if (env_1.default['RATE_LIMITER_GLOBAL_ENABLED'] === true) {
    (0, validate_env_1.validateEnv)(['RATE_LIMITER_GLOBAL_STORE', 'RATE_LIMITER_GLOBAL_DURATION', 'RATE_LIMITER_GLOBAL_POINTS']);
    validateConfiguration();
    exports.rateLimiterGlobal = (0, rate_limiter_1.createRateLimiter)('RATE_LIMITER_GLOBAL');
    checkRateLimit = (0, async_handler_1.default)(async (_req, res, next) => {
        try {
            await exports.rateLimiterGlobal.consume(RATE_LIMITER_GLOBAL_KEY, 1);
        }
        catch (rateLimiterRes) {
            if (rateLimiterRes instanceof Error)
                throw rateLimiterRes;
            res.set('Retry-After', String(Math.round(rateLimiterRes.msBeforeNext / 1000)));
            throw new index_1.HitRateLimitException(`Too many requests, retry after ${(0, ms_1.default)(rateLimiterRes.msBeforeNext)}.`, {
                limit: +env_1.default['RATE_LIMITER_GLOBAL_POINTS'],
                reset: new Date(Date.now() + rateLimiterRes.msBeforeNext),
            });
        }
        next();
    });
}
exports.default = checkRateLimit;
function validateConfiguration() {
    if (env_1.default['RATE_LIMITER_ENABLED'] !== true) {
        logger_1.default.error(`The IP based rate limiter needs to be enabled when using the global rate limiter.`);
        process.exit(1);
    }
    const globalPointsPerSec = Number(env_1.default['RATE_LIMITER_GLOBAL_POINTS']) / Math.max(Number(env_1.default['RATE_LIMITER_GLOBAL_DURATION']), 1);
    const regularPointsPerSec = Number(env_1.default['RATE_LIMITER_POINTS']) / Math.max(Number(env_1.default['RATE_LIMITER_DURATION']), 1);
    if (globalPointsPerSec <= regularPointsPerSec) {
        logger_1.default.error(`The global rate limiter needs to allow more requests per second than the IP based rate limiter.`);
        process.exit(1);
    }
}
