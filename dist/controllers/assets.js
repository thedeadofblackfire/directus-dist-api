"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const express_1 = require("express");
const lodash_1 = require("lodash");
const constants_1 = require("../constants");
const database_1 = __importDefault(require("../database"));
const env_1 = __importDefault(require("../env"));
const exceptions_1 = require("../exceptions");
const logger_1 = __importDefault(require("../logger"));
const use_collection_1 = __importDefault(require("../middleware/use-collection"));
const services_1 = require("../services");
const assets_1 = require("../types/assets");
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const get_cache_headers_1 = require("../utils/get-cache-headers");
const get_config_from_env_1 = require("../utils/get-config-from-env");
const get_milliseconds_1 = require("../utils/get-milliseconds");
const router = (0, express_1.Router)();
router.use((0, use_collection_1.default)('directus_files'));
router.get('/:pk/:filename?', 
// Validate query params
(0, async_handler_1.default)(async (req, res, next) => {
    const payloadService = new services_1.PayloadService('directus_settings', { schema: req.schema });
    const defaults = { storage_asset_presets: [], storage_asset_transform: 'all' };
    const database = (0, database_1.default)();
    const savedAssetSettings = await database
        .select('storage_asset_presets', 'storage_asset_transform')
        .from('directus_settings')
        .first();
    if (savedAssetSettings) {
        await payloadService.processValues('read', savedAssetSettings);
    }
    const assetSettings = savedAssetSettings || defaults;
    const transformation = (0, lodash_1.pick)(req.query, constants_1.ASSET_TRANSFORM_QUERY_KEYS);
    if ('key' in transformation && Object.keys(transformation).length > 1) {
        throw new exceptions_1.InvalidQueryException(`You can't combine the "key" query parameter with any other transformation.`);
    }
    if ('transforms' in transformation) {
        let transforms;
        // Try parse the JSON array
        try {
            transforms = (0, utils_1.parseJSON)(transformation['transforms']);
        }
        catch {
            throw new exceptions_1.InvalidQueryException(`"transforms" Parameter needs to be a JSON array of allowed transformations.`);
        }
        // Check if it is actually an array.
        if (!Array.isArray(transforms)) {
            throw new exceptions_1.InvalidQueryException(`"transforms" Parameter needs to be a JSON array of allowed transformations.`);
        }
        // Check against ASSETS_TRANSFORM_MAX_OPERATIONS
        if (transforms.length > Number(env_1.default['ASSETS_TRANSFORM_MAX_OPERATIONS'])) {
            throw new exceptions_1.InvalidQueryException(`"transforms" Parameter is only allowed ${env_1.default['ASSETS_TRANSFORM_MAX_OPERATIONS']} transformations.`);
        }
        // Check the transformations are valid
        transforms.forEach((transform) => {
            const name = transform[0];
            if (!assets_1.TransformationMethods.includes(name)) {
                throw new exceptions_1.InvalidQueryException(`"transforms" Parameter does not allow "${name}" as a transformation.`);
            }
        });
        transformation['transforms'] = transforms;
    }
    const systemKeys = constants_1.SYSTEM_ASSET_ALLOW_LIST.map((transformation) => transformation['key']);
    const allKeys = [
        ...systemKeys,
        ...(assetSettings.storage_asset_presets || []).map((transformation) => transformation['key']),
    ];
    // For use in the next request handler
    res.locals['shortcuts'] = [...constants_1.SYSTEM_ASSET_ALLOW_LIST, ...(assetSettings.storage_asset_presets || [])];
    res.locals['transformation'] = transformation;
    if (Object.keys(transformation).length === 0 ||
        ('transforms' in transformation && transformation['transforms'].length === 0)) {
        return next();
    }
    if (assetSettings.storage_asset_transform === 'all') {
        if (transformation['key'] && allKeys.includes(transformation['key']) === false) {
            throw new exceptions_1.InvalidQueryException(`Key "${transformation['key']}" isn't configured.`);
        }
        return next();
    }
    else if (assetSettings.storage_asset_transform === 'presets') {
        if (allKeys.includes(transformation['key']))
            return next();
        throw new exceptions_1.InvalidQueryException(`Only configured presets can be used in asset generation.`);
    }
    else {
        if (transformation['key'] && systemKeys.includes(transformation['key']))
            return next();
        throw new exceptions_1.InvalidQueryException(`Dynamic asset generation has been disabled for this project.`);
    }
}), (0, async_handler_1.default)(async (req, res, next) => {
    const helmet = await import('helmet');
    return helmet.contentSecurityPolicy((0, lodash_1.merge)({
        useDefaults: false,
        directives: {
            defaultSrc: ['none'],
        },
    }, (0, get_config_from_env_1.getConfigFromEnv)('ASSETS_CONTENT_SECURITY_POLICY')))(req, res, next);
}), 
// Return file
(0, async_handler_1.default)(async (req, res) => {
    const id = req.params['pk'].substring(0, 36);
    const service = new services_1.AssetsService({
        accountability: req.accountability,
        schema: req.schema,
    });
    const transformation = res.locals['transformation'].key
        ? res.locals['shortcuts'].find((transformation) => transformation['key'] === res.locals['transformation'].key)
        : res.locals['transformation'];
    let range = undefined;
    if (req.headers.range) {
        const rangeParts = /bytes=([0-9]*)-([0-9]*)/.exec(req.headers.range);
        if (rangeParts && rangeParts.length > 1) {
            range = {};
            if (rangeParts[1]) {
                range.start = Number(rangeParts[1]);
                if (Number.isNaN(range.start))
                    throw new exceptions_1.RangeNotSatisfiableException(range);
            }
            if (rangeParts[2]) {
                range.end = Number(rangeParts[2]);
                if (Number.isNaN(range.end))
                    throw new exceptions_1.RangeNotSatisfiableException(range);
            }
        }
    }
    const { stream, file, stat } = await service.getAsset(id, transformation, range);
    res.attachment(req.params['filename'] ?? file.filename_download);
    res.setHeader('Content-Type', file.type);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', (0, get_cache_headers_1.getCacheControlHeader)(req, (0, get_milliseconds_1.getMilliseconds)(env_1.default['ASSETS_CACHE_TTL']), false, true));
    const unixTime = Date.parse(file.modified_on);
    if (!Number.isNaN(unixTime)) {
        const lastModifiedDate = new Date(unixTime);
        res.setHeader('Last-Modified', lastModifiedDate.toUTCString());
    }
    if (range) {
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end || stat.size - 1}/${stat.size}`);
        res.status(206);
        res.setHeader('Content-Length', (range.end ? range.end + 1 : stat.size) - (range.start || 0));
    }
    else {
        res.setHeader('Content-Length', stat.size);
    }
    if ('download' in req.query === false) {
        res.removeHeader('Content-Disposition');
    }
    if (req.method.toLowerCase() === 'head') {
        res.status(200);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', stat.size);
        return res.end();
    }
    let isDataSent = false;
    stream.on('data', (chunk) => {
        isDataSent = true;
        res.write(chunk);
    });
    stream.on('end', () => {
        res.end();
    });
    stream.on('error', (e) => {
        logger_1.default.error(e, `Couldn't stream file ${file.id} to the client`);
        if (!isDataSent) {
            res.removeHeader('Content-Type');
            res.removeHeader('Content-Disposition');
            res.removeHeader('Cache-Control');
            res.status(500).json({
                errors: [
                    {
                        message: 'An unexpected error occurred.',
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                        },
                    },
                ],
            });
        }
    });
    return undefined;
}));
exports.default = router;
