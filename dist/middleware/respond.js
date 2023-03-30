"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.respond = void 0;
const bytes_1 = require("bytes");
const cache_1 = require("../cache");
const env_1 = __importDefault(require("../env"));
const logger_1 = __importDefault(require("../logger"));
const services_1 = require("../services");
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const get_cache_headers_1 = require("../utils/get-cache-headers");
const get_cache_key_1 = require("../utils/get-cache-key");
const get_date_formatted_1 = require("../utils/get-date-formatted");
const get_milliseconds_1 = require("../utils/get-milliseconds");
const get_string_byte_size_1 = require("../utils/get-string-byte-size");
exports.respond = (0, async_handler_1.default)(async (req, res) => {
    const { cache } = (0, cache_1.getCache)();
    let exceedsMaxSize = false;
    if (env_1.default['CACHE_VALUE_MAX_SIZE'] !== false) {
        const valueSize = res.locals['payload'] ? (0, get_string_byte_size_1.stringByteSize)(JSON.stringify(res.locals['payload'])) : 0;
        const maxSize = (0, bytes_1.parse)(env_1.default['CACHE_VALUE_MAX_SIZE']);
        exceedsMaxSize = valueSize > maxSize;
    }
    if ((req.method.toLowerCase() === 'get' || req.originalUrl?.startsWith('/graphql')) &&
        env_1.default['CACHE_ENABLED'] === true &&
        cache &&
        !req.sanitizedQuery.export &&
        res.locals['cache'] !== false &&
        exceedsMaxSize === false) {
        const key = (0, get_cache_key_1.getCacheKey)(req);
        try {
            await (0, cache_1.setCacheValue)(cache, key, res.locals['payload'], (0, get_milliseconds_1.getMilliseconds)(env_1.default['CACHE_TTL']));
            await (0, cache_1.setCacheValue)(cache, `${key}__expires_at`, { exp: Date.now() + (0, get_milliseconds_1.getMilliseconds)(env_1.default['CACHE_TTL'], 0) });
        }
        catch (err) {
            logger_1.default.warn(err, `[cache] Couldn't set key ${key}. ${err}`);
        }
        res.setHeader('Cache-Control', (0, get_cache_headers_1.getCacheControlHeader)(req, (0, get_milliseconds_1.getMilliseconds)(env_1.default['CACHE_TTL']), true, true));
        res.setHeader('Vary', 'Origin, Cache-Control');
    }
    else {
        // Don't cache anything by default
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Vary', 'Origin, Cache-Control');
    }
    if (req.sanitizedQuery.export) {
        const exportService = new services_1.ExportService({ accountability: req.accountability ?? null, schema: req.schema });
        let filename = '';
        if (req.collection) {
            filename += req.collection;
        }
        else {
            filename += 'Export';
        }
        filename += ' ' + (0, get_date_formatted_1.getDateFormatted)();
        if (req.sanitizedQuery.export === 'json') {
            res.attachment(`${filename}.json`);
            res.set('Content-Type', 'application/json');
            return res.status(200).send(exportService.transform(res.locals['payload']?.data, 'json'));
        }
        if (req.sanitizedQuery.export === 'xml') {
            res.attachment(`${filename}.xml`);
            res.set('Content-Type', 'text/xml');
            return res.status(200).send(exportService.transform(res.locals['payload']?.data, 'xml'));
        }
        if (req.sanitizedQuery.export === 'csv') {
            res.attachment(`${filename}.csv`);
            res.set('Content-Type', 'text/csv');
            return res.status(200).send(exportService.transform(res.locals['payload']?.data, 'csv'));
        }
        if (req.sanitizedQuery.export === 'yaml') {
            res.attachment(`${filename}.yaml`);
            res.set('Content-Type', 'text/yaml');
            return res.status(200).send(exportService.transform(res.locals['payload']?.data, 'yaml'));
        }
    }
    if (Buffer.isBuffer(res.locals['payload'])) {
        return res.end(res.locals['payload']);
    }
    else if (res.locals['payload']) {
        return res.json(res.locals['payload']);
    }
    else {
        return res.status(204).end();
    }
});
