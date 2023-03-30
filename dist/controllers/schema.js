"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const busboy_1 = __importDefault(require("busboy"));
const express_1 = __importDefault(require("express"));
const js_yaml_1 = require("js-yaml");
const exceptions_1 = require("../exceptions");
const logger_1 = __importDefault(require("../logger"));
const respond_1 = require("../middleware/respond");
const schema_1 = require("../services/schema");
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const get_versioned_hash_1 = require("../utils/get-versioned-hash");
const router = express_1.default.Router();
router.get('/snapshot', (0, async_handler_1.default)(async (req, res, next) => {
    const service = new schema_1.SchemaService({ accountability: req.accountability });
    const currentSnapshot = await service.snapshot();
    res.locals['payload'] = { data: currentSnapshot };
    return next();
}), respond_1.respond);
router.post('/apply', (0, async_handler_1.default)(async (req, _res, next) => {
    const service = new schema_1.SchemaService({ accountability: req.accountability });
    await service.apply(req.body);
    return next();
}), respond_1.respond);
const schemaMultipartHandler = (req, res, next) => {
    if (req.is('application/json')) {
        if (Object.keys(req.body).length === 0)
            throw new exceptions_1.InvalidPayloadException(`No data was included in the body`);
        res.locals['uploadedSnapshot'] = req.body;
        return next();
    }
    if (!req.is('multipart/form-data'))
        throw new exceptions_1.UnsupportedMediaTypeException(`Unsupported Content-Type header`);
    const headers = req.headers['content-type']
        ? req.headers
        : {
            ...req.headers,
            'content-type': 'application/octet-stream',
        };
    const busboy = (0, busboy_1.default)({ headers });
    let isFileIncluded = false;
    let uploadedSnapshot = null;
    busboy.on('file', async (_, fileStream, { mimeType }) => {
        if (isFileIncluded)
            return next(new exceptions_1.InvalidPayloadException(`More than one file was included in the body`));
        isFileIncluded = true;
        const { readableStreamToString } = await import('@directus/utils/node');
        try {
            const uploadedString = await readableStreamToString(fileStream);
            if (mimeType === 'application/json') {
                try {
                    uploadedSnapshot = (0, utils_1.parseJSON)(uploadedString);
                }
                catch (err) {
                    logger_1.default.warn(err);
                    throw new exceptions_1.InvalidPayloadException('Invalid JSON schema snapshot');
                }
            }
            else {
                try {
                    uploadedSnapshot = (await (0, js_yaml_1.load)(uploadedString));
                }
                catch (err) {
                    logger_1.default.warn(err);
                    throw new exceptions_1.InvalidPayloadException('Invalid YAML schema snapshot');
                }
            }
            if (!uploadedSnapshot)
                throw new exceptions_1.InvalidPayloadException(`No file was included in the body`);
            res.locals['uploadedSnapshot'] = uploadedSnapshot;
            return next();
        }
        catch (error) {
            busboy.emit('error', error);
        }
    });
    busboy.on('error', (error) => next(error));
    busboy.on('close', () => {
        if (!isFileIncluded)
            return next(new exceptions_1.InvalidPayloadException(`No file was included in the body`));
    });
    req.pipe(busboy);
};
router.post('/diff', (0, async_handler_1.default)(schemaMultipartHandler), (0, async_handler_1.default)(async (req, res, next) => {
    const service = new schema_1.SchemaService({ accountability: req.accountability });
    const snapshot = res.locals['uploadedSnapshot'];
    const currentSnapshot = await service.snapshot();
    const snapshotDiff = await service.diff(snapshot, { currentSnapshot, force: 'force' in req.query });
    if (!snapshotDiff)
        return next();
    const currentSnapshotHash = (0, get_versioned_hash_1.getVersionedHash)(currentSnapshot);
    res.locals['payload'] = { data: { hash: currentSnapshotHash, diff: snapshotDiff } };
    return next();
}), respond_1.respond);
exports.default = router;
