"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheControlHeader = void 0;
const env_1 = __importDefault(require("../env"));
const should_skip_cache_1 = require("./should-skip-cache");
/**
 * Returns the Cache-Control header for the current request
 *
 * @param req Express request object
 * @param ttl TTL of the cache in ms
 * @param globalCacheSettings Whether requests are affected by the global cache settings (i.e. for dynamic API requests)
 * @param personalized Whether requests depend on the authentication status of users
 */
function getCacheControlHeader(req, ttl, globalCacheSettings, personalized) {
    // When the user explicitly asked to skip the cache
    if ((0, should_skip_cache_1.shouldSkipCache)(req))
        return 'no-store';
    // When the resource / current request shouldn't be cached
    if (ttl === undefined || ttl < 0)
        return 'no-cache';
    // When the API cache can invalidate at any moment
    if (globalCacheSettings && env_1.default['CACHE_AUTO_PURGE'] === true)
        return 'no-cache';
    const headerValues = [];
    // When caching depends on the authentication status of the users
    if (personalized) {
        // Allow response to be stored in shared cache (public) or local cache only (private)
        const access = !!req.accountability?.role === false ? 'public' : 'private';
        headerValues.push(access);
    }
    // Cache control header uses seconds for everything
    const ttlSeconds = Math.round(ttl / 1000);
    headerValues.push(`max-age=${ttlSeconds}`);
    // When the s-maxage flag should be included
    if (globalCacheSettings && Number.isInteger(env_1.default['CACHE_CONTROL_S_MAXAGE']) && env_1.default['CACHE_CONTROL_S_MAXAGE'] >= 0) {
        headerValues.push(`s-maxage=${env_1.default['CACHE_CONTROL_S_MAXAGE']}`);
    }
    return headerValues.join(', ');
}
exports.getCacheControlHeader = getCacheControlHeader;
