"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldSkipCache = void 0;
const env_1 = require("../env");
const url_1 = require("./url");
/**
 * Whether to skip caching for the current request
 *
 * @param req Express request object
 */
function shouldSkipCache(req) {
    const env = (0, env_1.getEnv)();
    // Always skip cache for requests coming from the data studio based on Referer header
    const adminUrl = new url_1.Url(env['PUBLIC_URL']).addPath('admin').toString();
    if (req.get('Referer')?.startsWith(adminUrl))
        return true;
    if (env['CACHE_SKIP_ALLOWED'] && req.get('cache-control')?.includes('no-store'))
        return true;
    return false;
}
exports.shouldSkipCache = shouldSkipCache;
