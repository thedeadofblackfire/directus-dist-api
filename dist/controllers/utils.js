"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const argon2_1 = __importDefault(require("argon2"));
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const exceptions_1 = require("../exceptions");
const collection_exists_1 = __importDefault(require("../middleware/collection-exists"));
const respond_1 = require("../middleware/respond");
const services_1 = require("../services");
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const busboy_1 = __importDefault(require("busboy"));
const cache_1 = require("../cache");
const generate_hash_1 = require("../utils/generate-hash");
const sanitize_query_1 = require("../utils/sanitize-query");
const router = (0, express_1.Router)();
router.get('/random/string', (0, async_handler_1.default)(async (req, res) => {
    var _a;
    const { nanoid } = await import('nanoid');
    if (req.query && req.query.length && Number(req.query.length) > 500)
        throw new exceptions_1.InvalidQueryException(`"length" can't be more than 500 characters`);
    const string = nanoid(((_a = req.query) === null || _a === void 0 ? void 0 : _a.length) ? Number(req.query.length) : 32);
    return res.json({ data: string });
}));
router.post('/hash/generate', (0, async_handler_1.default)(async (req, res) => {
    var _a;
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.string)) {
        throw new exceptions_1.InvalidPayloadException(`"string" is required`);
    }
    const hash = await (0, generate_hash_1.generateHash)(req.body.string);
    return res.json({ data: hash });
}));
router.post('/hash/verify', (0, async_handler_1.default)(async (req, res) => {
    var _a, _b;
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.string)) {
        throw new exceptions_1.InvalidPayloadException(`"string" is required`);
    }
    if (!((_b = req.body) === null || _b === void 0 ? void 0 : _b.hash)) {
        throw new exceptions_1.InvalidPayloadException(`"hash" is required`);
    }
    const result = await argon2_1.default.verify(req.body.hash, req.body.string);
    return res.json({ data: result });
}));
const SortSchema = joi_1.default.object({
    item: joi_1.default.alternatives(joi_1.default.string(), joi_1.default.number()).required(),
    to: joi_1.default.alternatives(joi_1.default.string(), joi_1.default.number()).required(),
});
router.post('/sort/:collection', collection_exists_1.default, (0, async_handler_1.default)(async (req, res) => {
    const { error } = SortSchema.validate(req.body);
    if (error)
        throw new exceptions_1.InvalidPayloadException(error.message);
    const service = new services_1.UtilsService({
        accountability: req.accountability,
        schema: req.schema,
    });
    await service.sort(req.collection, req.body);
    return res.status(200).end();
}));
router.post('/revert/:revision', (0, async_handler_1.default)(async (req, res, next) => {
    const service = new services_1.RevisionsService({
        accountability: req.accountability,
        schema: req.schema,
    });
    await service.revert(req.params.revision);
    next();
}), respond_1.respond);
router.post('/import/:collection', collection_exists_1.default, (0, async_handler_1.default)(async (req, res, next) => {
    if (req.is('multipart/form-data') === false)
        throw new exceptions_1.UnsupportedMediaTypeException(`Unsupported Content-Type header`);
    const service = new services_1.ImportService({
        accountability: req.accountability,
        schema: req.schema,
    });
    let headers;
    if (req.headers['content-type']) {
        headers = req.headers;
    }
    else {
        headers = {
            ...req.headers,
            'content-type': 'application/octet-stream',
        };
    }
    const busboy = (0, busboy_1.default)({ headers });
    busboy.on('file', async (_fieldname, fileStream, { mimeType }) => {
        try {
            await service.import(req.params.collection, mimeType, fileStream);
        }
        catch (err) {
            return next(err);
        }
        return res.status(200).end();
    });
    busboy.on('error', (err) => next(err));
    req.pipe(busboy);
}));
router.post('/export/:collection', collection_exists_1.default, (0, async_handler_1.default)(async (req, res, next) => {
    var _a;
    if (!req.body.query) {
        throw new exceptions_1.InvalidPayloadException(`"query" is required.`);
    }
    if (!req.body.format) {
        throw new exceptions_1.InvalidPayloadException(`"format" is required.`);
    }
    const service = new services_1.ExportService({
        accountability: req.accountability,
        schema: req.schema,
    });
    const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)(req.body.query, (_a = req.accountability) !== null && _a !== void 0 ? _a : null);
    // We're not awaiting this, as it's supposed to run async in the background
    service.exportToFile(req.params.collection, sanitizedQuery, req.body.format, {
        file: req.body.file,
    });
    return next();
}), respond_1.respond);
router.post('/cache/clear', (0, async_handler_1.default)(async (req, res) => {
    var _a;
    if (((_a = req.accountability) === null || _a === void 0 ? void 0 : _a.admin) !== true) {
        throw new exceptions_1.ForbiddenException();
    }
    await (0, cache_1.flushCaches)(true);
    res.status(200).end();
}));
exports.default = router;
