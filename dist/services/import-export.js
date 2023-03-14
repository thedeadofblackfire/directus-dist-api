"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = exports.ImportService = void 0;
const utils_1 = require("@directus/shared/utils");
const async_1 = require("async");
const csv_parser_1 = __importDefault(require("csv-parser"));
const destroy_1 = __importDefault(require("destroy"));
const fs_extra_1 = require("fs-extra");
const js_yaml_1 = require("js-yaml");
const js2xmlparser_1 = require("js2xmlparser");
const json2csv_1 = require("json2csv");
const lodash_1 = require("lodash");
const StreamArray_1 = __importDefault(require("stream-json/streamers/StreamArray"));
const strip_bom_stream_1 = __importDefault(require("strip-bom-stream"));
const tmp_promise_1 = require("tmp-promise");
const database_1 = __importDefault(require("../database"));
const env_1 = __importDefault(require("../env"));
const exceptions_1 = require("../exceptions");
const logger_1 = __importDefault(require("../logger"));
const get_date_formatted_1 = require("../utils/get-date-formatted");
const files_1 = require("./files");
const items_1 = require("./items");
const notifications_1 = require("./notifications");
const emitter_1 = __importDefault(require("../emitter"));
class ImportService {
    constructor(options) {
        this.knex = options.knex || (0, database_1.default)();
        this.accountability = options.accountability || null;
        this.schema = options.schema;
    }
    async import(collection, mimetype, stream) {
        var _a, _b, _c, _d, _e, _f;
        if (((_a = this.accountability) === null || _a === void 0 ? void 0 : _a.admin) !== true && collection.startsWith('directus_'))
            throw new exceptions_1.ForbiddenException();
        const createPermissions = (_c = (_b = this.accountability) === null || _b === void 0 ? void 0 : _b.permissions) === null || _c === void 0 ? void 0 : _c.find((permission) => permission.collection === collection && permission.action === 'create');
        const updatePermissions = (_e = (_d = this.accountability) === null || _d === void 0 ? void 0 : _d.permissions) === null || _e === void 0 ? void 0 : _e.find((permission) => permission.collection === collection && permission.action === 'update');
        if (((_f = this.accountability) === null || _f === void 0 ? void 0 : _f.admin) !== true && (!createPermissions || !updatePermissions)) {
            throw new exceptions_1.ForbiddenException();
        }
        switch (mimetype) {
            case 'application/json':
                return await this.importJSON(collection, stream);
            case 'text/csv':
            case 'application/vnd.ms-excel':
                return await this.importCSV(collection, stream);
            default:
                throw new exceptions_1.UnsupportedMediaTypeException(`Can't import files of type "${mimetype}"`);
        }
    }
    importJSON(collection, stream) {
        const extractJSON = StreamArray_1.default.withParser();
        const nestedActionEvents = [];
        return this.knex.transaction((trx) => {
            const service = new items_1.ItemsService(collection, {
                knex: trx,
                schema: this.schema,
                accountability: this.accountability,
            });
            const saveQueue = (0, async_1.queue)(async (value) => {
                return await service.upsertOne(value, { bypassEmitAction: (params) => nestedActionEvents.push(params) });
            });
            return new Promise((resolve, reject) => {
                stream.pipe(extractJSON);
                extractJSON.on('data', ({ value }) => {
                    saveQueue.push(value);
                });
                extractJSON.on('error', (err) => {
                    (0, destroy_1.default)(stream);
                    (0, destroy_1.default)(extractJSON);
                    reject(new exceptions_1.InvalidPayloadException(err.message));
                });
                saveQueue.error((err) => {
                    reject(err);
                });
                extractJSON.on('end', () => {
                    saveQueue.drain(() => {
                        for (const nestedActionEvent of nestedActionEvents) {
                            emitter_1.default.emitAction(nestedActionEvent.event, nestedActionEvent.meta, nestedActionEvent.context);
                        }
                        return resolve();
                    });
                });
            });
        });
    }
    importCSV(collection, stream) {
        const nestedActionEvents = [];
        return this.knex.transaction((trx) => {
            const service = new items_1.ItemsService(collection, {
                knex: trx,
                schema: this.schema,
                accountability: this.accountability,
            });
            const saveQueue = (0, async_1.queue)(async (value) => {
                return await service.upsertOne(value, { bypassEmitAction: (action) => nestedActionEvents.push(action) });
            });
            return new Promise((resolve, reject) => {
                stream
                    .pipe((0, strip_bom_stream_1.default)())
                    .pipe((0, csv_parser_1.default)())
                    .on('data', (value) => {
                    const obj = (0, lodash_1.transform)(value, (result, value, key) => {
                        if (value.length === 0) {
                            delete result[key];
                        }
                        else {
                            try {
                                const parsedJson = (0, utils_1.parseJSON)(value);
                                if (typeof parsedJson === 'number') {
                                    (0, lodash_1.set)(result, key, value);
                                }
                                else {
                                    (0, lodash_1.set)(result, key, parsedJson);
                                }
                            }
                            catch {
                                (0, lodash_1.set)(result, key, value);
                            }
                        }
                    });
                    saveQueue.push(obj);
                })
                    .on('error', (err) => {
                    (0, destroy_1.default)(stream);
                    reject(new exceptions_1.InvalidPayloadException(err.message));
                })
                    .on('end', () => {
                    saveQueue.drain(() => {
                        for (const nestedActionEvent of nestedActionEvents) {
                            emitter_1.default.emitAction(nestedActionEvent.event, nestedActionEvent.meta, nestedActionEvent.context);
                        }
                        return resolve();
                    });
                });
                saveQueue.error((err) => {
                    reject(err);
                });
            });
        });
    }
}
exports.ImportService = ImportService;
class ExportService {
    constructor(options) {
        this.knex = options.knex || (0, database_1.default)();
        this.accountability = options.accountability || null;
        this.schema = options.schema;
    }
    /**
     * Export the query results as a named file. Will query in batches, and keep appending a tmp file
     * until all the data is retrieved. Uploads the result as a new file using the regular
     * FilesService upload method.
     */
    async exportToFile(collection, query, format, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            const mimeTypes = {
                csv: 'text/csv',
                json: 'application/json',
                xml: 'text/xml',
                yaml: 'text/yaml',
            };
            const database = (0, database_1.default)();
            const { path, cleanup } = await (0, tmp_promise_1.file)();
            await database.transaction(async (trx) => {
                var _a;
                const service = new items_1.ItemsService(collection, {
                    accountability: this.accountability,
                    schema: this.schema,
                    knex: trx,
                });
                const totalCount = await service
                    .readByQuery({
                    ...query,
                    aggregate: {
                        count: ['*'],
                    },
                })
                    .then((result) => { var _a, _b; return Number((_b = (_a = result === null || result === void 0 ? void 0 : result[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0); });
                const count = query.limit ? Math.min(totalCount, query.limit) : totalCount;
                const requestedLimit = (_a = query.limit) !== null && _a !== void 0 ? _a : -1;
                const batchesRequired = Math.ceil(count / env_1.default.EXPORT_BATCH_SIZE);
                let readCount = 0;
                for (let batch = 0; batch < batchesRequired; batch++) {
                    let limit = env_1.default.EXPORT_BATCH_SIZE;
                    if (requestedLimit > 0 && env_1.default.EXPORT_BATCH_SIZE > requestedLimit - readCount) {
                        limit = requestedLimit - readCount;
                    }
                    const result = await service.readByQuery({
                        ...query,
                        limit,
                        offset: batch * env_1.default.EXPORT_BATCH_SIZE,
                    });
                    readCount += result.length;
                    if (result.length) {
                        await (0, fs_extra_1.appendFile)(path, this.transform(result, format, {
                            includeHeader: batch === 0,
                            includeFooter: batch + 1 === batchesRequired,
                        }));
                    }
                }
            });
            const filesService = new files_1.FilesService({
                accountability: this.accountability,
                schema: this.schema,
            });
            const storage = (0, utils_1.toArray)(env_1.default.STORAGE_LOCATIONS)[0];
            const title = `export-${collection}-${(0, get_date_formatted_1.getDateFormatted)()}`;
            const filename = `${title}.${format}`;
            const fileWithDefaults = {
                ...((_a = options === null || options === void 0 ? void 0 : options.file) !== null && _a !== void 0 ? _a : {}),
                title: (_c = (_b = options === null || options === void 0 ? void 0 : options.file) === null || _b === void 0 ? void 0 : _b.title) !== null && _c !== void 0 ? _c : title,
                filename_download: (_e = (_d = options === null || options === void 0 ? void 0 : options.file) === null || _d === void 0 ? void 0 : _d.filename_download) !== null && _e !== void 0 ? _e : filename,
                storage: (_g = (_f = options === null || options === void 0 ? void 0 : options.file) === null || _f === void 0 ? void 0 : _f.storage) !== null && _g !== void 0 ? _g : storage,
                type: mimeTypes[format],
            };
            const savedFile = await filesService.uploadOne((0, fs_extra_1.createReadStream)(path), fileWithDefaults);
            if ((_h = this.accountability) === null || _h === void 0 ? void 0 : _h.user) {
                const notificationsService = new notifications_1.NotificationsService({
                    accountability: this.accountability,
                    schema: this.schema,
                });
                await notificationsService.createOne({
                    recipient: this.accountability.user,
                    sender: this.accountability.user,
                    subject: `Your export of ${collection} is ready`,
                    collection: `directus_files`,
                    item: savedFile,
                });
            }
            await cleanup();
        }
        catch (err) {
            logger_1.default.error(err, `Couldn't export ${collection}: ${err.message}`);
            if ((_j = this.accountability) === null || _j === void 0 ? void 0 : _j.user) {
                const notificationsService = new notifications_1.NotificationsService({
                    accountability: this.accountability,
                    schema: this.schema,
                });
                await notificationsService.createOne({
                    recipient: this.accountability.user,
                    sender: this.accountability.user,
                    subject: `Your export of ${collection} failed`,
                    message: `Please contact your system administrator for more information.`,
                });
            }
        }
    }
    /**
     * Transform a given input object / array to the given type
     */
    transform(input, format, options) {
        if (format === 'json') {
            let string = JSON.stringify(input || null, null, '\t');
            if ((options === null || options === void 0 ? void 0 : options.includeHeader) === false)
                string = string.split('\n').slice(1).join('\n');
            if ((options === null || options === void 0 ? void 0 : options.includeFooter) === false) {
                const lines = string.split('\n');
                string = lines.slice(0, lines.length - 1).join('\n');
                string += ',\n';
            }
            return string;
        }
        if (format === 'xml') {
            let string = (0, js2xmlparser_1.parse)('data', input);
            if ((options === null || options === void 0 ? void 0 : options.includeHeader) === false)
                string = string.split('\n').slice(2).join('\n');
            if ((options === null || options === void 0 ? void 0 : options.includeFooter) === false) {
                const lines = string.split('\n');
                string = lines.slice(0, lines.length - 1).join('\n');
                string += '\n';
            }
            return string;
        }
        if (format === 'csv') {
            if (input.length === 0)
                return '';
            const parser = new json2csv_1.Parser({
                transforms: [json2csv_1.transforms.flatten({ separator: '.' })],
                header: (options === null || options === void 0 ? void 0 : options.includeHeader) !== false,
            });
            let string = parser.parse(input);
            if ((options === null || options === void 0 ? void 0 : options.includeHeader) === false) {
                string = '\n' + string;
            }
            return string;
        }
        if (format === 'yaml') {
            return (0, js_yaml_1.dump)(input);
        }
        throw new exceptions_1.ServiceUnavailableException(`Illegal export type used: "${format}"`, { service: 'export' });
    }
}
exports.ExportService = ExportService;
