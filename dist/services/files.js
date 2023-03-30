"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesService = void 0;
const utils_1 = require("@directus/shared/utils");
const encodeurl_1 = __importDefault(require("encodeurl"));
const exif_reader_1 = __importDefault(require("exif-reader"));
const icc_1 = require("icc");
const lodash_1 = require("lodash");
const mime_types_1 = require("mime-types");
const promises_1 = require("node:stream/promises");
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const url_1 = __importDefault(require("url"));
const emitter_1 = __importDefault(require("../emitter"));
const env_1 = __importDefault(require("../env"));
const exceptions_1 = require("../exceptions");
const logger_1 = __importDefault(require("../logger"));
const index_1 = require("../request/index");
const storage_1 = require("../storage");
const parse_image_metadata_1 = require("../utils/parse-image-metadata");
const items_1 = require("./items");
// @ts-ignore
const format_title_1 = __importDefault(require("@directus/format-title"));
class FilesService extends items_1.ItemsService {
    constructor(options) {
        super('directus_files', options);
    }
    /**
     * Upload a single new file to the configured storage adapter
     */
    async uploadOne(stream, data, primaryKey, opts) {
        const storage = await (0, storage_1.getStorage)();
        let existingFile = {};
        if (primaryKey !== undefined) {
            existingFile =
                (await this.knex
                    .select('folder', 'filename_download')
                    .from('directus_files')
                    .where({ id: primaryKey })
                    .first()) ?? {};
        }
        const payload = { ...existingFile, ...(0, lodash_1.clone)(data) };
        if ('folder' in payload === false) {
            const settings = await this.knex.select('storage_default_folder').from('directus_settings').first();
            if (settings?.storage_default_folder) {
                payload.folder = settings.storage_default_folder;
            }
        }
        if (primaryKey !== undefined) {
            await this.updateOne(primaryKey, payload, { emitEvents: false });
            // If the file you're uploading already exists, we'll consider this upload a replace. In that case, we'll
            // delete the previously saved file and thumbnails to ensure they're generated fresh
            const disk = storage.location(payload.storage);
            for await (const filepath of disk.list(String(primaryKey))) {
                await disk.delete(filepath);
            }
        }
        else {
            primaryKey = await this.createOne(payload, { emitEvents: false });
        }
        const fileExtension = path_1.default.extname(payload.filename_download) || (payload.type && '.' + (0, mime_types_1.extension)(payload.type)) || '';
        payload.filename_disk = primaryKey + (fileExtension || '');
        if (!payload.type) {
            payload.type = 'application/octet-stream';
        }
        try {
            await storage.location(data.storage).write(payload.filename_disk, stream, payload.type);
        }
        catch (err) {
            logger_1.default.warn(`Couldn't save file ${payload.filename_disk}`);
            logger_1.default.warn(err);
            throw new exceptions_1.ServiceUnavailableException(`Couldn't save file ${payload.filename_disk}`, { service: 'files' });
        }
        const { size } = await storage.location(data.storage).stat(payload.filename_disk);
        payload.filesize = size;
        if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff'].includes(payload.type)) {
            const stream = await storage.location(data.storage).read(payload.filename_disk);
            const { height, width, description, title, tags, metadata } = await this.getMetadata(stream);
            payload.height ??= height ?? null;
            payload.width ??= width ?? null;
            payload.description ??= description ?? null;
            payload.title ??= title ?? null;
            payload.tags ??= tags ?? null;
            payload.metadata ??= metadata ?? null;
        }
        // We do this in a service without accountability. Even if you don't have update permissions to the file,
        // we still want to be able to set the extracted values from the file on create
        const sudoService = new items_1.ItemsService('directus_files', {
            knex: this.knex,
            schema: this.schema,
        });
        await sudoService.updateOne(primaryKey, payload, { emitEvents: false });
        if (this.cache && env_1.default['CACHE_AUTO_PURGE'] && opts?.autoPurgeCache !== false) {
            await this.cache.clear();
        }
        if (opts?.emitEvents !== false) {
            emitter_1.default.emitAction('files.upload', {
                payload,
                key: primaryKey,
                collection: this.collection,
            }, {
                database: this.knex,
                schema: this.schema,
                accountability: this.accountability,
            });
        }
        return primaryKey;
    }
    /**
     * Extract metadata from a buffer's content
     */
    async getMetadata(stream, allowList = env_1.default['FILE_METADATA_ALLOW_LIST']) {
        return new Promise((resolve, reject) => {
            (0, promises_1.pipeline)(stream, (0, sharp_1.default)().metadata(async (err, sharpMetadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                const metadata = {};
                if (sharpMetadata.orientation && sharpMetadata.orientation >= 5) {
                    metadata.height = sharpMetadata.width;
                    metadata.width = sharpMetadata.height;
                }
                else {
                    metadata.width = sharpMetadata.width;
                    metadata.height = sharpMetadata.height;
                }
                // Backward-compatible layout as it used to be with 'exifr'
                const fullMetadata = {};
                if (sharpMetadata.exif) {
                    try {
                        const { image, thumbnail, interoperability, ...rest } = (0, exif_reader_1.default)(sharpMetadata.exif);
                        if (image) {
                            fullMetadata.ifd0 = image;
                        }
                        if (thumbnail) {
                            fullMetadata.ifd1 = thumbnail;
                        }
                        if (interoperability) {
                            fullMetadata.interop = interoperability;
                        }
                        Object.assign(fullMetadata, rest);
                    }
                    catch (err) {
                        logger_1.default.warn(`Couldn't extract EXIF metadata from file`);
                        logger_1.default.warn(err);
                    }
                }
                if (sharpMetadata.icc) {
                    try {
                        fullMetadata.icc = (0, icc_1.parse)(sharpMetadata.icc);
                    }
                    catch (err) {
                        logger_1.default.warn(`Couldn't extract ICC profile data from file`);
                        logger_1.default.warn(err);
                    }
                }
                if (sharpMetadata.iptc) {
                    try {
                        fullMetadata.iptc = (0, parse_image_metadata_1.parseIptc)(sharpMetadata.iptc);
                    }
                    catch (err) {
                        logger_1.default.warn(`Couldn't extract IPTC Photo Metadata from file`);
                        logger_1.default.warn(err);
                    }
                }
                if (sharpMetadata.xmp) {
                    try {
                        fullMetadata.xmp = (0, parse_image_metadata_1.parseXmp)(sharpMetadata.xmp);
                    }
                    catch (err) {
                        logger_1.default.warn(`Couldn't extract XMP data from file`);
                        logger_1.default.warn(err);
                    }
                }
                if (fullMetadata?.iptc?.['Caption'] && typeof fullMetadata.iptc['Caption'] === 'string') {
                    metadata.description = fullMetadata.iptc?.['Caption'];
                }
                if (fullMetadata?.iptc?.['Headline'] && typeof fullMetadata.iptc['Headline'] === 'string') {
                    metadata.title = fullMetadata.iptc['Headline'];
                }
                if (fullMetadata?.iptc?.['Keywords']) {
                    metadata.tags = fullMetadata.iptc['Keywords'];
                }
                if (allowList === '*' || allowList?.[0] === '*') {
                    metadata.metadata = fullMetadata;
                }
                else {
                    metadata.metadata = (0, lodash_1.pick)(fullMetadata, allowList);
                }
                // Fix (incorrectly parsed?) values starting / ending with spaces,
                // limited to one level and string values only
                for (const section of Object.keys(metadata.metadata)) {
                    for (const [key, value] of Object.entries(metadata.metadata[section])) {
                        if (typeof value === 'string') {
                            metadata.metadata[section][key] = value.trim();
                        }
                    }
                }
                resolve(metadata);
            }));
        });
    }
    /**
     * Import a single file from an external URL
     */
    async importOne(importURL, body) {
        const fileCreatePermissions = this.accountability?.permissions?.find((permission) => permission.collection === 'directus_files' && permission.action === 'create');
        if (this.accountability && this.accountability?.admin !== true && !fileCreatePermissions) {
            throw new exceptions_1.ForbiddenException();
        }
        let fileResponse;
        try {
            const axios = await (0, index_1.getAxios)();
            fileResponse = await axios.get((0, encodeurl_1.default)(importURL), {
                responseType: 'stream',
            });
        }
        catch (err) {
            logger_1.default.warn(err, `Couldn't fetch file from URL "${importURL}"`);
            throw new exceptions_1.ServiceUnavailableException(`Couldn't fetch file from url "${importURL}"`, {
                service: 'external-file',
            });
        }
        const parsedURL = url_1.default.parse(fileResponse.request.res.responseUrl);
        const filename = decodeURI(path_1.default.basename(parsedURL.pathname));
        const payload = {
            filename_download: filename,
            storage: (0, utils_1.toArray)(env_1.default['STORAGE_LOCATIONS'])[0],
            type: fileResponse.headers['content-type'],
            title: (0, format_title_1.default)(filename),
            ...(body || {}),
        };
        return await this.uploadOne(fileResponse.data, payload);
    }
    /**
     * Create a file (only applicable when it is not a multipart/data POST request)
     * Useful for associating metadata with existing file in storage
     */
    async createOne(data, opts) {
        if (!data.type) {
            throw new exceptions_1.InvalidPayloadException(`"type" is required`);
        }
        const key = await super.createOne(data, opts);
        return key;
    }
    /**
     * Delete a file
     */
    async deleteOne(key, opts) {
        await this.deleteMany([key], opts);
        return key;
    }
    /**
     * Delete multiple files
     */
    async deleteMany(keys, opts) {
        const storage = await (0, storage_1.getStorage)();
        const files = await super.readMany(keys, { fields: ['id', 'storage'], limit: -1 });
        if (!files) {
            throw new exceptions_1.ForbiddenException();
        }
        await super.deleteMany(keys);
        for (const file of files) {
            const disk = storage.location(file['storage']);
            // Delete file + thumbnails
            for await (const filepath of disk.list(file['id'])) {
                await disk.delete(filepath);
            }
        }
        if (this.cache && env_1.default['CACHE_AUTO_PURGE'] && opts?.autoPurgeCache !== false) {
            await this.cache.clear();
        }
        return keys;
    }
}
exports.FilesService = FilesService;
