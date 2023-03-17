"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const json2csv_1 = require("json2csv");
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const node_os_1 = require("node:os");
const stream_1 = require("stream");
const vitest_1 = require("vitest");
const _1 = require(".");
const __1 = require("..");
const emitter_1 = __importDefault(require("../emitter"));
vitest_1.vi.mock('../../src/database/index', () => ({
    default: vitest_1.vi.fn(),
    getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres'),
}));
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(async () => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: knex_mock_client_1.MockClient }));
        tracker = (0, knex_mock_client_1.createTracker)(db);
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
    });
    (0, vitest_1.describe)('Services / ImportService', () => {
        let service;
        let insertedId = 1;
        const collection = 'test_coll';
        (0, vitest_1.beforeEach)(() => {
            service = new _1.ImportService({
                knex: db,
                schema: {
                    collections: {
                        [collection]: {
                            collection,
                            primary: 'id',
                            singleton: false,
                            sortField: null,
                            note: null,
                            accountability: null,
                            fields: {
                                id: {
                                    field: 'id',
                                    defaultValue: null,
                                    nullable: false,
                                    generated: true,
                                    type: 'integer',
                                    dbType: 'integer',
                                    precision: null,
                                    scale: null,
                                    special: [],
                                    note: null,
                                    validation: null,
                                    alias: false,
                                },
                                name: {
                                    field: 'name',
                                    defaultValue: null,
                                    nullable: true,
                                    generated: false,
                                    type: 'string',
                                    dbType: 'string',
                                    precision: null,
                                    scale: null,
                                    special: [],
                                    note: null,
                                    validation: null,
                                    alias: false,
                                },
                            },
                        },
                    },
                    relations: [],
                },
            });
            insertedId = 1;
        });
        (0, vitest_1.describe)('importJSON', () => {
            (0, vitest_1.it)('Emits action for correct number of times', async () => {
                const emitActionSpy = vitest_1.vi.spyOn(emitter_1.default, 'emitAction');
                const data = [{ name: 'aaa' }, { name: 'bbb' }, { name: 'ccc' }];
                const stream = new stream_1.Readable({
                    read() {
                        this.push(JSON.stringify(data));
                        this.push(null);
                    },
                });
                tracker.on.insert(collection).response(() => [insertedId++]);
                await service.importJSON(collection, stream);
                (0, vitest_1.expect)(emitActionSpy).toBeCalledTimes(insertedId - 1);
            });
        });
        (0, vitest_1.describe)('importCSV', () => {
            (0, vitest_1.it)('Emits action for correct number of times', async () => {
                const emitActionSpy = vitest_1.vi.spyOn(emitter_1.default, 'emitAction');
                const data = [{ name: 'ddd' }, { name: 'eee' }, { name: 'fff' }];
                const stream = new stream_1.Readable({
                    read() {
                        this.push((0, json2csv_1.parse)(data));
                        this.push(null);
                    },
                });
                tracker.on.insert(collection).response(() => [insertedId++]);
                await service.importCSV(collection, stream);
                (0, vitest_1.expect)(emitActionSpy).toBeCalledTimes(insertedId - 1);
            });
        });
    });
    (0, vitest_1.describe)('Services / ExportService', () => {
        (0, vitest_1.describe)('transform', () => {
            (0, vitest_1.it)('should return json string with header and footer', () => {
                const input = [{ key: 'value' }];
                const service = new _1.ExportService({ knex: db, schema: { collections: {}, relations: [] } });
                (0, vitest_1.expect)(service.transform(input, 'json')).toBe(`[\n\t{\n\t\t"key": "value"\n\t}\n]`);
            });
            (0, vitest_1.it)('should return xml string with header and footer', () => {
                const input = [{ key: 'value' }];
                const service = new _1.ExportService({ knex: db, schema: { collections: {}, relations: [] } });
                (0, vitest_1.expect)(service.transform(input, 'xml')).toBe(`<?xml version='1.0'?>\n<data>\n    <data>\n        <key>value</key>\n    </data>\n</data>`);
            });
            (0, vitest_1.it)('should return csv string with header', () => {
                const input = [{ key: 'value' }];
                const service = new _1.ExportService({ knex: db, schema: { collections: {}, relations: [] } });
                (0, vitest_1.expect)(service.transform(input, 'csv')).toBe(`"key"${node_os_1.EOL}"value"`);
            });
            (0, vitest_1.it)('should return csv string without header', () => {
                const input = [{ key: 'value' }];
                const service = new _1.ExportService({ knex: db, schema: { collections: {}, relations: [] } });
                (0, vitest_1.expect)(service.transform(input, 'csv', { includeHeader: false })).toBe('\n"value"');
            });
            (0, vitest_1.it)('should return yaml string', () => {
                const input = [{ key: 'value' }];
                const service = new _1.ExportService({ knex: db, schema: { collections: {}, relations: [] } });
                (0, vitest_1.expect)(service.transform(input, 'yaml')).toBe('- key: value\n');
            });
            (0, vitest_1.it)('should throw ServiceUnavailableException error when using a non-existent export type', () => {
                const input = [{ key: 'value' }];
                const service = new _1.ExportService({ knex: db, schema: { collections: {}, relations: [] } });
                (0, vitest_1.expect)(() => service.transform(input, 'invalid-format')).toThrowError(__1.ServiceUnavailableException);
            });
        });
    });
});
