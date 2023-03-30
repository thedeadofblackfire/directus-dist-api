"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheValue = exports.setCacheValue = exports.getSchemaCache = exports.setSchemaCache = exports.getSystemCache = exports.setSystemCache = exports.clearSystemCache = exports.flushCaches = exports.getCache = void 0;
const keyv_1 = __importDefault(require("keyv"));
const env_1 = __importDefault(require("./env"));
const logger_1 = __importDefault(require("./logger"));
const compress_1 = require("./utils/compress");
const get_config_from_env_1 = require("./utils/get-config-from-env");
const get_milliseconds_1 = require("./utils/get-milliseconds");
const validate_env_1 = require("./utils/validate-env");
const messenger_1 = require("./messenger");
const utils_1 = require("@directus/shared/utils");
let cache = null;
let systemCache = null;
let localSchemaCache = null;
let sharedSchemaCache = null;
let lockCache = null;
let messengerSubscribed = false;
const messenger = (0, messenger_1.getMessenger)();
if (env_1.default['MESSENGER_STORE'] === 'redis' &&
    env_1.default['CACHE_STORE'] === 'memory' &&
    env_1.default['CACHE_AUTO_PURGE'] &&
    !messengerSubscribed) {
    messengerSubscribed = true;
    messenger.subscribe('schemaChanged', async (opts) => {
        if (cache && opts?.['autoPurgeCache'] !== false) {
            await cache.clear();
        }
    });
}
function getCache() {
    if (env_1.default['CACHE_ENABLED'] === true && cache === null) {
        (0, validate_env_1.validateEnv)(['CACHE_NAMESPACE', 'CACHE_TTL', 'CACHE_STORE']);
        cache = getKeyvInstance(env_1.default['CACHE_STORE'], (0, get_milliseconds_1.getMilliseconds)(env_1.default['CACHE_TTL']));
        cache.on('error', (err) => logger_1.default.warn(err, `[cache] ${err}`));
    }
    if (systemCache === null) {
        systemCache = getKeyvInstance(env_1.default['CACHE_STORE'], (0, get_milliseconds_1.getMilliseconds)(env_1.default['CACHE_SYSTEM_TTL']), '_system');
        systemCache.on('error', (err) => logger_1.default.warn(err, `[system-cache] ${err}`));
    }
    if (sharedSchemaCache === null) {
        sharedSchemaCache = getKeyvInstance(env_1.default['CACHE_STORE'], (0, get_milliseconds_1.getMilliseconds)(env_1.default['CACHE_SYSTEM_TTL']), '_schema_shared');
        sharedSchemaCache.on('error', (err) => logger_1.default.warn(err, `[shared-schema-cache] ${err}`));
    }
    if (localSchemaCache === null) {
        localSchemaCache = getKeyvInstance('memory', (0, get_milliseconds_1.getMilliseconds)(env_1.default['CACHE_SYSTEM_TTL']), '_schema');
        localSchemaCache.on('error', (err) => logger_1.default.warn(err, `[schema-cache] ${err}`));
    }
    if (lockCache === null) {
        lockCache = getKeyvInstance(env_1.default['CACHE_STORE'], undefined, '_lock');
        lockCache.on('error', (err) => logger_1.default.warn(err, `[lock-cache] ${err}`));
    }
    return { cache, systemCache, sharedSchemaCache, localSchemaCache, lockCache };
}
exports.getCache = getCache;
async function flushCaches(forced) {
    const { cache } = getCache();
    await clearSystemCache({ forced });
    await cache?.clear();
}
exports.flushCaches = flushCaches;
async function clearSystemCache(opts) {
    const { systemCache, localSchemaCache, lockCache } = getCache();
    // Flush system cache when forced or when system cache lock not set
    if (opts?.forced || !(await lockCache.get('system-cache-lock'))) {
        await lockCache.set('system-cache-lock', true, 10000);
        await systemCache.clear();
        await lockCache.delete('system-cache-lock');
    }
    await localSchemaCache.clear();
    messenger.publish('schemaChanged', { autoPurgeCache: opts?.autoPurgeCache });
}
exports.clearSystemCache = clearSystemCache;
async function setSystemCache(key, value, ttl) {
    const { systemCache, lockCache } = getCache();
    if (!(await lockCache.get('system-cache-lock'))) {
        await setCacheValue(systemCache, key, value, ttl);
    }
}
exports.setSystemCache = setSystemCache;
async function getSystemCache(key) {
    const { systemCache } = getCache();
    return await getCacheValue(systemCache, key);
}
exports.getSystemCache = getSystemCache;
async function setSchemaCache(schema) {
    const { localSchemaCache, sharedSchemaCache } = getCache();
    const schemaHash = await (0, utils_1.getSimpleHash)(JSON.stringify(schema));
    await sharedSchemaCache.set('hash', schemaHash);
    await localSchemaCache.set('schema', schema);
    await localSchemaCache.set('hash', schemaHash);
}
exports.setSchemaCache = setSchemaCache;
async function getSchemaCache() {
    const { localSchemaCache, sharedSchemaCache } = getCache();
    const sharedSchemaHash = await sharedSchemaCache.get('hash');
    if (!sharedSchemaHash)
        return;
    const localSchemaHash = await localSchemaCache.get('hash');
    if (!localSchemaHash || localSchemaHash !== sharedSchemaHash)
        return;
    return await localSchemaCache.get('schema');
}
exports.getSchemaCache = getSchemaCache;
async function setCacheValue(cache, key, value, ttl) {
    const compressed = await (0, compress_1.compress)(value);
    await cache.set(key, compressed, ttl);
}
exports.setCacheValue = setCacheValue;
async function getCacheValue(cache, key) {
    const value = await cache.get(key);
    if (!value)
        return undefined;
    const decompressed = await (0, compress_1.decompress)(value);
    return decompressed;
}
exports.getCacheValue = getCacheValue;
function getKeyvInstance(store, ttl, namespaceSuffix) {
    switch (store) {
        case 'redis':
            return new keyv_1.default(getConfig('redis', ttl, namespaceSuffix));
        case 'memcache':
            return new keyv_1.default(getConfig('memcache', ttl, namespaceSuffix));
        case 'memory':
        default:
            return new keyv_1.default(getConfig('memory', ttl, namespaceSuffix));
    }
}
function getConfig(store = 'memory', ttl, namespaceSuffix = '') {
    const config = {
        namespace: `${env_1.default['CACHE_NAMESPACE']}${namespaceSuffix}`,
        ttl,
    };
    if (store === 'redis') {
        const KeyvRedis = require('@keyv/redis');
        config.store = new KeyvRedis(env_1.default['CACHE_REDIS'] || (0, get_config_from_env_1.getConfigFromEnv)('CACHE_REDIS_'));
    }
    if (store === 'memcache') {
        const KeyvMemcache = require('keyv-memcache');
        // keyv-memcache uses memjs which only accepts a comma separated string instead of an array,
        // so we need to join array into a string when applicable. See #7986
        const cacheMemcache = Array.isArray(env_1.default['CACHE_MEMCACHE'])
            ? env_1.default['CACHE_MEMCACHE'].join(',')
            : env_1.default['CACHE_MEMCACHE'];
        config.store = new KeyvMemcache(cacheMemcache);
    }
    return config;
}
