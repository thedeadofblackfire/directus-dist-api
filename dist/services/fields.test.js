"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const vitest_1 = require("vitest");
const _1 = require(".");
const exceptions_1 = require("../exceptions");
vitest_1.vi.mock('../../src/database/index', () => ({
    default: vitest_1.vi.fn(),
    getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres'),
    getSchemaInspector: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(() => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: knex_mock_client_1.MockClient }));
        tracker = (0, knex_mock_client_1.getTracker)();
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
    });
    (0, vitest_1.describe)('Services / Fields', () => {
        let service;
        (0, vitest_1.beforeEach)(() => {
            service = new _1.FieldsService({
                schema: { collections: {}, relations: [] },
            });
        });
        (0, vitest_1.afterEach)(() => {
            vitest_1.vi.clearAllMocks();
        });
        (0, vitest_1.describe)('addColumnToTable', () => {
            let knexCreateTableBuilderSpy;
            vitest_1.it.each(['alias', 'unknown'])('%s fields should be skipped', async (type) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const promise = db.schema.alterTable(testCollection, (table) => {
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                        },
                        meta: {},
                    });
                });
                await (0, vitest_1.expect)(promise).resolves.not.toThrow();
            });
            (0, vitest_1.it)('illegal fields should be throw InvalidPayloadException', async () => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const type = 'mystery';
                vitest_1.expect.assertions(2); // to ensure both assertions in the catch block are reached
                try {
                    await db.schema.alterTable(testCollection, (table) => {
                        service.addColumnToTable(table, {
                            collection: testCollection,
                            field: testField,
                            type,
                            schema: {
                                name: testField,
                                table: testCollection,
                                data_type: type,
                            },
                            meta: {},
                        });
                    });
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`Illegal type passed: "${type}"`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.InvalidPayloadException);
                }
            });
            vitest_1.it.each([
                { type: 'integer', method: 'increments' },
                { type: 'bigInteger', method: 'bigIncrements' },
            ])('auto increment $type fields should use $method()', async ({ type, method }) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" .*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable(testCollection, (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, method);
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                            has_auto_increment: true,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField);
            });
            vitest_1.it.each([10, undefined])('string fields should use string() with %j max length', async (maxLength) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const type = 'string';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" .*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable(testCollection, (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, type);
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                            max_length: maxLength,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField, maxLength);
            });
            vitest_1.it.each(['float', 'decimal'])('precision and scale for %s fields should fallback to default value', async (type) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" ${type}.*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable(testCollection, (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, type);
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField, 10, 5);
            });
            vitest_1.it.each(['float', 'decimal'])('zero precision or scale for %s fields should not fallback to default value', async (type) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" ${type}.*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable('test_collection', (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, type);
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                            numeric_precision: 0,
                            numeric_scale: 0,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField, 0, 0);
            });
            (0, vitest_1.it)('csv fields should use string()', async () => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const type = 'csv';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" .*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable(testCollection, (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, 'string');
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField);
            });
            (0, vitest_1.it)('hash fields should use string() with length 255', async () => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const type = 'hash';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" .*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable(testCollection, (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, 'string');
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField, 255);
            });
            vitest_1.it.each([
                { type: 'dateTime', useTz: false },
                { type: 'timestamp', useTz: true },
            ])('$type fields should use $type() with { useTz: $useTz } option', async ({ type, useTz }) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" .*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable(testCollection, (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, type);
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField, { useTz });
            });
            vitest_1.it.each(['geometry', 'geometry.Point'])('%s fields should use this.helpers.st.createColumn()', async (type) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" .*`);
                tracker.on.any(regex).response({});
                const thisHelpersStCreateColumnSpy = vitest_1.vi.spyOn(service.helpers.st, 'createColumn');
                await db.schema.alterTable(testCollection, (table) => {
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(thisHelpersStCreateColumnSpy).toHaveBeenCalled();
            });
            // the rest of KNEX_TYPES except the ones above
            vitest_1.it.each([
                { type: 'boolean' },
                { type: 'date' },
                { type: 'json' },
                { type: 'text' },
                { type: 'time' },
                { type: 'binary' },
                { type: 'uuid' },
            ])('$type fields should use $type()', async ({ type }) => {
                const testCollection = 'test_collection';
                const testField = 'test_field';
                const regex = new RegExp(`alter table "${testCollection}" add column "${testField}" .*`);
                tracker.on.any(regex).response({});
                await db.schema.alterTable(testCollection, (table) => {
                    knexCreateTableBuilderSpy = vitest_1.vi.spyOn(table, type);
                    service.addColumnToTable(table, {
                        collection: testCollection,
                        field: testField,
                        type,
                        schema: {
                            name: testField,
                            table: testCollection,
                            data_type: type,
                        },
                        meta: {},
                    });
                });
                (0, vitest_1.expect)(knexCreateTableBuilderSpy).toHaveBeenCalledWith(testField);
            });
        });
    });
});
