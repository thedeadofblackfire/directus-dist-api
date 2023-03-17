"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const services_1 = require("../../src/services");
const helpers_1 = require("../../src/database/helpers");
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../src/database/index', () => ({
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
    (0, vitest_1.describe)('Services / PayloadService', () => {
        (0, vitest_1.describe)('transformers', () => {
            let service;
            let helpers;
            (0, vitest_1.beforeEach)(() => {
                service = new services_1.PayloadService('test', {
                    knex: db,
                    schema: { collections: {}, relations: [] },
                });
                helpers = (0, helpers_1.getHelpers)(db);
            });
            (0, vitest_1.describe)('csv', () => {
                (0, vitest_1.it)('Returns undefined for illegal values', async () => {
                    const result = await service.transformers['cast-csv']({
                        value: 123,
                        action: 'read',
                        payload: {},
                        accountability: { role: null },
                        specials: [],
                        helpers,
                    });
                    (0, vitest_1.expect)(result).toBe(undefined);
                });
                (0, vitest_1.it)('Returns [] for empty strings', async () => {
                    const result = await service.transformers['cast-csv']({
                        value: '',
                        action: 'read',
                        payload: {},
                        accountability: { role: null },
                        specials: [],
                        helpers,
                    });
                    (0, vitest_1.expect)(result).toMatchObject([]);
                });
                (0, vitest_1.it)('Returns array values as is', async () => {
                    const result = await service.transformers['cast-csv']({
                        value: ['test', 'directus'],
                        action: 'read',
                        payload: {},
                        accountability: { role: null },
                        specials: [],
                        helpers,
                    });
                    (0, vitest_1.expect)(result).toEqual(['test', 'directus']);
                });
                (0, vitest_1.it)('Splits the CSV string', async () => {
                    const result = await service.transformers['cast-csv']({
                        value: 'test,directus',
                        action: 'read',
                        payload: {},
                        accountability: { role: null },
                        specials: [],
                        helpers,
                    });
                    (0, vitest_1.expect)(result).toMatchObject(['test', 'directus']);
                });
                (0, vitest_1.it)('Saves array values as joined string', async () => {
                    const result = await service.transformers['cast-csv']({
                        value: ['test', 'directus'],
                        action: 'create',
                        payload: {},
                        accountability: { role: null },
                        specials: [],
                        helpers,
                    });
                    (0, vitest_1.expect)(result).toBe('test,directus');
                });
                (0, vitest_1.it)('Saves string values as is', async () => {
                    const result = await service.transformers['cast-csv']({
                        value: 'test,directus',
                        action: 'create',
                        payload: {},
                        accountability: { role: null },
                        specials: [],
                        helpers,
                    });
                    (0, vitest_1.expect)(result).toBe('test,directus');
                });
            });
        });
        (0, vitest_1.describe)('processDates', () => {
            let service;
            const dateFieldId = 'date_field';
            const dateTimeFieldId = 'datetime_field';
            const timestampFieldId = 'timestamp_field';
            (0, vitest_1.beforeEach)(() => {
                service = new services_1.PayloadService('test', {
                    knex: db,
                    schema: {
                        collections: {
                            test: {
                                collection: 'test',
                                primary: 'id',
                                singleton: false,
                                sortField: null,
                                note: null,
                                accountability: null,
                                fields: {
                                    [dateFieldId]: {
                                        field: dateFieldId,
                                        defaultValue: null,
                                        nullable: true,
                                        generated: false,
                                        type: 'date',
                                        dbType: 'date',
                                        precision: null,
                                        scale: null,
                                        special: [],
                                        note: null,
                                        validation: null,
                                        alias: false,
                                    },
                                    [dateTimeFieldId]: {
                                        field: dateTimeFieldId,
                                        defaultValue: null,
                                        nullable: true,
                                        generated: false,
                                        type: 'dateTime',
                                        dbType: 'datetime',
                                        precision: null,
                                        scale: null,
                                        special: [],
                                        note: null,
                                        validation: null,
                                        alias: false,
                                    },
                                    [timestampFieldId]: {
                                        field: timestampFieldId,
                                        defaultValue: null,
                                        nullable: true,
                                        generated: false,
                                        type: 'timestamp',
                                        dbType: 'timestamp',
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
            });
            (0, vitest_1.describe)('processes dates', () => {
                (0, vitest_1.it)('with zero values', () => {
                    const result = service.processDates([
                        {
                            [dateFieldId]: '0000-00-00',
                            [dateTimeFieldId]: '0000-00-00 00:00:00',
                            [timestampFieldId]: '0000-00-00 00:00:00.000',
                        },
                    ], 'read');
                    (0, vitest_1.expect)(result).toMatchObject([
                        {
                            [dateFieldId]: null,
                            [dateTimeFieldId]: null,
                            [timestampFieldId]: null,
                        },
                    ]);
                });
                (0, vitest_1.it)('with typical values', () => {
                    const result = service.processDates([
                        {
                            [dateFieldId]: '2022-01-10',
                            [dateTimeFieldId]: '2021-09-31 12:34:56',
                            [timestampFieldId]: '1980-12-08 00:11:22.333',
                        },
                    ], 'read');
                    (0, vitest_1.expect)(result).toMatchObject([
                        {
                            [dateFieldId]: '2022-01-10',
                            [dateTimeFieldId]: '2021-10-01T12:34:56',
                            [timestampFieldId]: new Date('1980-12-08 00:11:22.333').toISOString(),
                        },
                    ]);
                });
                (0, vitest_1.it)('with date object values', () => {
                    const result = service.processDates([
                        {
                            [dateFieldId]: new Date(1666777777000),
                            [dateTimeFieldId]: new Date(1666666666000),
                            [timestampFieldId]: new Date(1666555444333),
                        },
                    ], 'read');
                    (0, vitest_1.expect)(result).toMatchObject([
                        {
                            [dateFieldId]: toLocalISOString(new Date(1666777777000)).slice(0, 10),
                            [dateTimeFieldId]: toLocalISOString(new Date(1666666666000)),
                            [timestampFieldId]: new Date(1666555444333).toISOString(),
                        },
                    ]);
                });
            });
        });
    });
});
function toLocalISOString(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
