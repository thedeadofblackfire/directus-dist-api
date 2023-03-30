"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const lodash_1 = require("lodash");
const mime_types_1 = require("mime-types");
const object_hash_1 = __importDefault(require("object-hash"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_validate_1 = __importDefault(require("uuid-validate"));
const database_1 = __importDefault(require("../database"));
const env_1 = __importDefault(require("../env"));
const exceptions_1 = require("../exceptions");
const service_unavailable_1 = require("../exceptions/service-unavailable");
const logger_1 = __importDefault(require("../logger"));
const storage_1 = require("../storage");
const get_milliseconds_1 = require("../utils/get-milliseconds");
const TransformationUtils = __importStar(require("../utils/transformations"));
const authorization_1 = require("./authorization");
class AssetsService {
    knex;
    accountability;
    authorizationService;
    constructor(options) {
        this.knex = options.knex || (0, database_1.default)();
        this.accountability = options.accountability || null;
        this.authorizationService = new authorization_1.AuthorizationService(options);
    }
    async getAsset(id, transformation, range) {
        const storage = await (0, storage_1.getStorage)();
        const publicSettings = await this.knex
            .select('project_logo', 'public_background', 'public_foreground')
            .from('directus_settings')
            .first();
        const systemPublicKeys = Object.values(publicSettings || {});
        /**
         * This is a little annoying. Postgres will error out if you're trying to search in `where`
         * with a wrong type. In case of directus_files where id is a uuid, we'll have to verify the
         * validity of the uuid ahead of time.
         */
        const isValidUUID = (0, uuid_validate_1.default)(id, 4);
        if (isValidUUID === false)
            throw new exceptions_1.ForbiddenException();
        if (systemPublicKeys.includes(id) === false && this.accountability?.admin !== true) {
            await this.authorizationService.checkAccess('read', 'directus_files', id);
        }
        const file = (await this.knex.select('*').from('directus_files').where({ id }).first());
        if (!file)
            throw new exceptions_1.ForbiddenException();
        const exists = await storage.location(file.storage).exists(file.filename_disk);
        if (!exists)
            throw new exceptions_1.ForbiddenException();
        if (range) {
            const missingRangeLimits = range.start === undefined && range.end === undefined;
            const endBeforeStart = range.start !== undefined && range.end !== undefined && range.end <= range.start;
            const startOverflow = range.start !== undefined && range.start >= file.filesize;
            const endUnderflow = range.end !== undefined && range.end <= 0;
            if (missingRangeLimits || endBeforeStart || startOverflow || endUnderflow) {
                throw new exceptions_1.RangeNotSatisfiableException(range);
            }
            const lastByte = file.filesize - 1;
            if (range.end) {
                if (range.start === undefined) {
                    // fetch chunk from tail
                    range.start = file.filesize - range.end;
                    range.end = lastByte;
                }
                if (range.end >= file.filesize) {
                    // fetch entire file
                    range.end = lastByte;
                }
            }
            if (range.start) {
                if (range.end === undefined) {
                    // fetch entire file
                    range.end = lastByte;
                }
                if (range.start < 0) {
                    // fetch file from head
                    range.start = 0;
                }
            }
        }
        const type = file.type;
        const transforms = TransformationUtils.resolvePreset(transformation, file);
        // We can only transform JPEG, PNG, and WebP
        if (type && transforms.length > 0 && ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(type)) {
            const maybeNewFormat = TransformationUtils.maybeExtractFormat(transforms);
            const assetFilename = path_1.default.basename(file.filename_disk, path_1.default.extname(file.filename_disk)) +
                getAssetSuffix(transforms) +
                (maybeNewFormat ? `.${maybeNewFormat}` : path_1.default.extname(file.filename_disk));
            const exists = await storage.location(file.storage).exists(assetFilename);
            if (maybeNewFormat) {
                file.type = (0, mime_types_1.contentType)(assetFilename) || null;
            }
            if (exists) {
                return {
                    stream: await storage.location(file.storage).read(assetFilename, range),
                    file,
                    stat: await storage.location(file.storage).stat(assetFilename),
                };
            }
            // Check image size before transforming. Processing an image that's too large for the
            // system memory will kill the API. Sharp technically checks for this too in it's
            // limitInputPixels, but we should have that check applied before starting the read streams
            const { width, height } = file;
            if (!width ||
                !height ||
                width > env_1.default['ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION'] ||
                height > env_1.default['ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION']) {
                throw new exceptions_1.IllegalAssetTransformation(`Image is too large to be transformed, or image size couldn't be determined.`);
            }
            const { queue, process } = sharp_1.default.counters();
            if (queue + process > env_1.default['ASSETS_TRANSFORM_MAX_CONCURRENT']) {
                throw new service_unavailable_1.ServiceUnavailableException('Server too busy', {
                    service: 'files',
                });
            }
            const readStream = await storage.location(file.storage).read(file.filename_disk, range);
            const transformer = (0, sharp_1.default)({
                limitInputPixels: Math.pow(env_1.default['ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION'], 2),
                sequentialRead: true,
                failOn: env_1.default['ASSETS_INVALID_IMAGE_SENSITIVITY_LEVEL'],
            });
            transformer.timeout({
                seconds: (0, lodash_1.clamp)(Math.round((0, get_milliseconds_1.getMilliseconds)(env_1.default['ASSETS_TRANSFORM_TIMEOUT'], 0) / 1000), 1, 3600),
            });
            if (transforms.find((transform) => transform[0] === 'rotate') === undefined)
                transformer.rotate();
            transforms.forEach(([method, ...args]) => transformer[method].apply(transformer, args));
            readStream.on('error', (e) => {
                logger_1.default.error(e, `Couldn't transform file ${file.id}`);
                readStream.unpipe(transformer);
            });
            await storage.location(file.storage).write(assetFilename, readStream.pipe(transformer), type);
            return {
                stream: await storage.location(file.storage).read(assetFilename, range),
                stat: await storage.location(file.storage).stat(assetFilename),
                file,
            };
        }
        else {
            const readStream = await storage.location(file.storage).read(file.filename_disk, range);
            const stat = await storage.location(file.storage).stat(file.filename_disk);
            return { stream: readStream, file, stat };
        }
    }
}
exports.AssetsService = AssetsService;
const getAssetSuffix = (transforms) => {
    if (Object.keys(transforms).length === 0)
        return '';
    return `__${(0, object_hash_1.default)(transforms)}`;
};
