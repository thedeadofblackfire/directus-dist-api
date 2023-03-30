"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
const lodash_1 = require("lodash");
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const env_1 = __importDefault(require("./env"));
const get_config_from_env_1 = require("./utils/get-config-from-env");
function createRateLimiter(configPrefix = 'RATE_LIMITER', configOverrides) {
    switch (env_1.default['RATE_LIMITER_STORE']) {
        case 'redis':
            return new rate_limiter_flexible_1.RateLimiterRedis(getConfig('redis', configPrefix, configOverrides));
        case 'memcache':
            return new rate_limiter_flexible_1.RateLimiterMemcache(getConfig('memcache', configPrefix, configOverrides));
        case 'memory':
        default:
            return new rate_limiter_flexible_1.RateLimiterMemory(getConfig('memory', configPrefix, configOverrides));
    }
}
exports.createRateLimiter = createRateLimiter;
function getConfig(store = 'memory', configPrefix = 'RATE_LIMITER', overrides) {
    const config = (0, get_config_from_env_1.getConfigFromEnv)(`${configPrefix}_`, `${configPrefix}_${store}_`);
    if (store === 'redis') {
        const Redis = require('ioredis');
        delete config.redis;
        config.storeClient = new Redis(env_1.default[`${configPrefix}_REDIS`] || (0, get_config_from_env_1.getConfigFromEnv)(`${configPrefix}_REDIS_`));
    }
    if (store === 'memcache') {
        const Memcached = require('memcached');
        config.storeClient = new Memcached(env_1.default[`${configPrefix}_MEMCACHE`], (0, get_config_from_env_1.getConfigFromEnv)(`${configPrefix}_MEMCACHE_`));
    }
    delete config.enabled;
    delete config.store;
    (0, lodash_1.merge)(config, overrides || {});
    return config;
}
