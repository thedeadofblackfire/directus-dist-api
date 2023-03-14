"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../cache");
const env_1 = __importDefault(require("../env"));
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const get_cache_headers_1 = require("../utils/get-cache-headers");
const get_cache_key_1 = require("../utils/get-cache-key");
const should_skip_cache_1 = require("../utils/should-skip-cache");
const logger_1 = __importDefault(require("../logger"));
const checkCacheMiddleware = (0, async_handler_1.default)(async (req, res, next) => {
    var _a, _b;
    const { cache } = (0, cache_1.getCache)();
    if (req.method.toLowerCase() !== 'get' && ((_a = req.originalUrl) === null || _a === void 0 ? void 0 : _a.startsWith('/graphql')) === false)
        return next();
    if (env_1.default.CACHE_ENABLED !== true)
        return next();
    if (!cache)
        return next();
    if ((0, should_skip_cache_1.shouldSkipCache)(req)) {
        if (env_1.default.CACHE_STATUS_HEADER)
            res.setHeader(`${env_1.default.CACHE_STATUS_HEADER}`, 'MISS');
        return next();
    }
    const key = (0, get_cache_key_1.getCacheKey)(req);
    let cachedData;
    try {
        cachedData = await (0, cache_1.getCacheValue)(cache, key);
    }
    catch (err) {
        logger_1.default.warn(err, `[cache] Couldn't read key ${key}. ${err.message}`);
        if (env_1.default.CACHE_STATUS_HEADER)
            res.setHeader(`${env_1.default.CACHE_STATUS_HEADER}`, 'MISS');
        return next();
    }
    if (cachedData) {
        let cacheExpiryDate;
        try {
            cacheExpiryDate = (_b = (await (0, cache_1.getCacheValue)(cache, `${key}__expires_at`))) === null || _b === void 0 ? void 0 : _b.exp;
        }
        catch (err) {
            logger_1.default.warn(err, `[cache] Couldn't read key ${`${key}__expires_at`}. ${err.message}`);
            if (env_1.default.CACHE_STATUS_HEADER)
                res.setHeader(`${env_1.default.CACHE_STATUS_HEADER}`, 'MISS');
            return next();
        }
        const cacheTTL = cacheExpiryDate ? cacheExpiryDate - Date.now() : undefined;
        res.setHeader('Cache-Control', (0, get_cache_headers_1.getCacheControlHeader)(req, cacheTTL, true, true));
        res.setHeader('Vary', 'Origin, Cache-Control');
        if (env_1.default.CACHE_STATUS_HEADER)
            res.setHeader(`${env_1.default.CACHE_STATUS_HEADER}`, 'HIT');
        return res.json(cachedData);
    }
    else {
        if (env_1.default.CACHE_STATUS_HEADER)
            res.setHeader(`${env_1.default.CACHE_STATUS_HEADER}`, 'MISS');
        return next();
    }
});
exports.default = checkCacheMiddleware;
