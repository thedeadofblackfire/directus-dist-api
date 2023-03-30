"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@directus/shared/constants");
const utils_1 = require("@directus/shared/utils");
const express_1 = require("express");
const env_1 = __importDefault(require("../env"));
const exceptions_1 = require("../exceptions");
const extensions_1 = require("../extensions");
const respond_1 = require("../middleware/respond");
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const get_cache_headers_1 = require("../utils/get-cache-headers");
const get_milliseconds_1 = require("../utils/get-milliseconds");
const router = (0, express_1.Router)();
router.get('/:type', (0, async_handler_1.default)(async (req, res, next) => {
    const type = (0, utils_1.depluralize)(req.params['type']);
    if (!(0, utils_1.isIn)(type, constants_1.EXTENSION_TYPES)) {
        throw new exceptions_1.RouteNotFoundException(req.path);
    }
    const extensionManager = (0, extensions_1.getExtensionManager)();
    const extensions = extensionManager.getExtensionsList(type);
    res.locals['payload'] = {
        data: extensions,
    };
    return next();
}), respond_1.respond);
router.get('/sources/index.js', (0, async_handler_1.default)(async (req, res) => {
    const extensionManager = (0, extensions_1.getExtensionManager)();
    const extensionSource = extensionManager.getAppExtensions();
    if (extensionSource === null) {
        throw new exceptions_1.RouteNotFoundException(req.path);
    }
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    res.setHeader('Cache-Control', (0, get_cache_headers_1.getCacheControlHeader)(req, (0, get_milliseconds_1.getMilliseconds)(env_1.default['EXTENSIONS_CACHE_TTL']), false, false));
    res.setHeader('Vary', 'Origin, Cache-Control');
    res.end(extensionSource);
}));
exports.default = router;
