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
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const schemas_1 = require("../__utils__/schemas");
const services_1 = require("../services");
const apply_snapshot_1 = require("./apply-snapshot");
const getSchema = __importStar(require("./get-schema"));
const snapshots_1 = require("../__utils__/snapshots");
const vitest_1 = require("vitest");
class Client_PG extends knex_mock_client_1.MockClient {
}
(0, vitest_1.describe)('applySnapshot', () => {
    let db;
    let tracker;
    const mutationOptions = {
        autoPurgeSystemCache: false,
        bypassEmitAction: vitest_1.expect.any(Function),
    };
    (0, vitest_1.beforeEach)(() => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: Client_PG }));
        tracker = (0, knex_mock_client_1.createTracker)(db);
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Creating new collection(s)', () => {
        (0, vitest_1.it)('Creates new top-level collection(s)', async () => {
            const expected = {
                collection: 'test_table_2',
                meta: {
                    accountability: 'all',
                    collection: 'test_table_2',
                    group: null,
                    hidden: true,
                    icon: 'import_export',
                    item_duplication_fields: null,
                    note: null,
                    singleton: false,
                    translations: {},
                },
                schema: { name: 'test_table_2' },
                fields: [
                    {
                        collection: 'test_table_2',
                        field: 'id',
                        meta: {
                            collection: 'test_table_2',
                            conditions: null,
                            display: null,
                            display_options: null,
                            field: 'id',
                            group: null,
                            hidden: true,
                            interface: null,
                            note: null,
                            options: null,
                            readonly: false,
                            required: false,
                            sort: null,
                            special: null,
                            translations: {},
                            validation: null,
                            validation_message: null,
                            width: 'full',
                        },
                        schema: {
                            data_type: 'uuid',
                            default_value: null,
                            foreign_key_column: null,
                            foreign_key_table: null,
                            generation_expression: null,
                            has_auto_increment: false,
                            is_generated: false,
                            is_nullable: false,
                            is_primary_key: true,
                            is_unique: true,
                            max_length: null,
                            name: 'id',
                            numeric_precision: null,
                            numeric_scale: null,
                            table: 'test_table_2',
                        },
                        type: 'uuid',
                    },
                ],
            };
            // Stop call to db later on in apply-snapshot
            vitest_1.vi.spyOn(getSchema, 'getSchema').mockReturnValue(Promise.resolve(schemas_1.snapshotApplyTestSchema));
            // We are not actually testing that createOne works, just that is is called correctly
            const createOneCollectionSpy = vitest_1.vi.spyOn(services_1.CollectionsService.prototype, 'createOne').mockResolvedValue('test');
            const createFieldSpy = vitest_1.vi.spyOn(services_1.FieldsService.prototype, 'createField').mockResolvedValue();
            await (0, apply_snapshot_1.applySnapshot)(snapshots_1.snapshotCreateCollectionNotNested, {
                database: db,
                current: snapshots_1.snapshotBeforeCreateCollection,
                schema: schemas_1.snapshotApplyTestSchema,
            });
            (0, vitest_1.expect)(createOneCollectionSpy).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(createOneCollectionSpy).toHaveBeenCalledWith(expected, mutationOptions);
            // There should be no fields left to create
            // they will get filtered in createCollections
            (0, vitest_1.expect)(createFieldSpy).toHaveBeenCalledTimes(0);
        });
        (0, vitest_1.it)('Creates the highest-level nested collection(s) with existing parents and any children', async () => {
            const expected = {
                collection: 'test_table_2',
                meta: {
                    accountability: 'all',
                    collection: 'test_table_2',
                    group: 'test_table',
                    hidden: true,
                    icon: 'import_export',
                    item_duplication_fields: null,
                    note: null,
                    singleton: false,
                    translations: {},
                },
                schema: { name: 'test_table_2' },
                fields: [
                    {
                        collection: 'test_table_2',
                        field: 'id',
                        meta: {
                            collection: 'test_table_2',
                            conditions: null,
                            display: null,
                            display_options: null,
                            field: 'id',
                            group: null,
                            hidden: true,
                            interface: null,
                            note: null,
                            options: null,
                            readonly: false,
                            required: false,
                            sort: null,
                            special: null,
                            translations: {},
                            validation: null,
                            validation_message: null,
                            width: 'full',
                        },
                        schema: {
                            data_type: 'uuid',
                            default_value: null,
                            foreign_key_column: null,
                            foreign_key_table: null,
                            generation_expression: null,
                            has_auto_increment: false,
                            is_generated: false,
                            is_nullable: false,
                            is_primary_key: true,
                            is_unique: true,
                            max_length: null,
                            name: 'id',
                            numeric_precision: null,
                            numeric_scale: null,
                            table: 'test_table_2',
                        },
                        type: 'uuid',
                    },
                ],
            };
            const expected2 = {
                collection: 'test_table_3',
                fields: [
                    {
                        collection: 'test_table_3',
                        field: 'id',
                        meta: {
                            collection: 'test_table_3',
                            conditions: null,
                            display: null,
                            display_options: null,
                            field: 'id',
                            group: null,
                            hidden: true,
                            interface: null,
                            note: null,
                            options: null,
                            readonly: false,
                            required: false,
                            sort: null,
                            special: null,
                            translations: {},
                            validation: null,
                            validation_message: null,
                            width: 'full',
                        },
                        schema: {
                            data_type: 'uuid',
                            default_value: null,
                            foreign_key_column: null,
                            foreign_key_table: null,
                            generation_expression: null,
                            has_auto_increment: false,
                            is_generated: false,
                            is_nullable: false,
                            is_primary_key: true,
                            is_unique: true,
                            max_length: null,
                            name: 'id',
                            numeric_precision: null,
                            numeric_scale: null,
                            table: 'test_table_3',
                        },
                        type: 'uuid',
                    },
                ],
                meta: {
                    accountability: 'all',
                    collection: 'test_table_3',
                    group: 'test_table_2',
                    hidden: true,
                    icon: 'import_export',
                    item_duplication_fields: null,
                    note: null,
                    singleton: false,
                    translations: {},
                },
                schema: { name: 'test_table_3' },
            };
            // Stop call to db later on in apply-snapshot
            vitest_1.vi.spyOn(getSchema, 'getSchema').mockReturnValue(Promise.resolve(schemas_1.snapshotApplyTestSchema));
            // We are not actually testing that createOne works, just that is is called correctly
            const createOneCollectionSpy = vitest_1.vi.spyOn(services_1.CollectionsService.prototype, 'createOne').mockResolvedValue('test');
            const createFieldSpy = vitest_1.vi.spyOn(services_1.FieldsService.prototype, 'createField').mockResolvedValue();
            await (0, apply_snapshot_1.applySnapshot)(snapshots_1.snapshotCreateCollection, {
                database: db,
                current: snapshots_1.snapshotBeforeCreateCollection,
                schema: schemas_1.snapshotApplyTestSchema,
            });
            (0, vitest_1.expect)(createOneCollectionSpy).toHaveBeenCalledTimes(2);
            (0, vitest_1.expect)(createOneCollectionSpy).toHaveBeenCalledWith(expected, mutationOptions);
            (0, vitest_1.expect)(createOneCollectionSpy).toHaveBeenCalledWith(expected2, mutationOptions);
            // There should be no fields left to create
            // they will get filtered in createCollections
            (0, vitest_1.expect)(createFieldSpy).toHaveBeenCalledTimes(0);
        });
    });
    (0, vitest_1.describe)('Creating new collection with UUID primary key field', () => {
        const fieldSchemaMaxLength = 36;
        vitest_1.it.each(['char', 'varchar'])('casts non-postgres schema snapshots of UUID fields as %s(36) to UUID type', async (fieldSchemaDataType) => {
            const snapshotToApply = {
                version: 1,
                directus: '0.0.0',
                collections: [
                    {
                        collection: 'test_uuid_table',
                        meta: {
                            accountability: 'all',
                            collection: 'test_uuid_table',
                            group: null,
                            hidden: true,
                            icon: 'box',
                            item_duplication_fields: null,
                            note: null,
                            singleton: false,
                            translations: {},
                        },
                        schema: { name: 'test_uuid_table' },
                    },
                ],
                fields: [
                    {
                        collection: 'test_uuid_table',
                        field: 'id',
                        meta: {
                            collection: 'test_uuid_table',
                            conditions: null,
                            display: null,
                            display_options: null,
                            field: 'id',
                            group: null,
                            hidden: true,
                            interface: null,
                            note: null,
                            options: null,
                            readonly: false,
                            required: false,
                            sort: null,
                            special: null,
                            translations: {},
                            validation: null,
                            validation_message: null,
                            width: 'full',
                        },
                        schema: {
                            comment: null,
                            data_type: fieldSchemaDataType,
                            default_value: null,
                            foreign_key_column: null,
                            foreign_key_schema: null,
                            foreign_key_table: null,
                            generation_expression: null,
                            has_auto_increment: false,
                            is_generated: false,
                            is_nullable: false,
                            is_primary_key: true,
                            is_unique: true,
                            max_length: fieldSchemaMaxLength,
                            name: 'id',
                            numeric_precision: null,
                            numeric_scale: null,
                            table: 'test_uuid_table',
                        },
                        type: 'uuid',
                    },
                ],
                relations: [],
            };
            const expected = {
                collection: 'test_uuid_table',
                meta: {
                    accountability: 'all',
                    collection: 'test_uuid_table',
                    group: null,
                    hidden: true,
                    icon: 'box',
                    item_duplication_fields: null,
                    note: null,
                    singleton: false,
                    translations: {},
                },
                schema: { name: 'test_uuid_table' },
                fields: [
                    {
                        collection: 'test_uuid_table',
                        field: 'id',
                        meta: {
                            collection: 'test_uuid_table',
                            conditions: null,
                            display: null,
                            display_options: null,
                            field: 'id',
                            group: null,
                            hidden: true,
                            interface: null,
                            note: null,
                            options: null,
                            readonly: false,
                            required: false,
                            sort: null,
                            special: null,
                            translations: {},
                            validation: null,
                            validation_message: null,
                            width: 'full',
                        },
                        schema: {
                            data_type: 'uuid',
                            default_value: null,
                            foreign_key_column: null,
                            foreign_key_table: null,
                            generation_expression: null,
                            has_auto_increment: false,
                            is_generated: false,
                            is_nullable: false,
                            is_primary_key: true,
                            is_unique: true,
                            max_length: null,
                            name: 'id',
                            numeric_precision: null,
                            numeric_scale: null,
                            table: 'test_uuid_table',
                        },
                        type: 'uuid',
                    },
                ],
            };
            // Stop call to db later on in apply-snapshot
            vitest_1.vi.spyOn(getSchema, 'getSchema').mockReturnValue(Promise.resolve(schemas_1.snapshotApplyTestSchema));
            // We are not actually testing that createOne works, just that is is called with the right data type
            const createOneCollectionSpy = vitest_1.vi.spyOn(services_1.CollectionsService.prototype, 'createOne').mockResolvedValue('test');
            vitest_1.vi.spyOn(services_1.FieldsService.prototype, 'createField').mockResolvedValue();
            await (0, apply_snapshot_1.applySnapshot)(snapshotToApply, {
                database: db,
                current: {
                    version: 1,
                    directus: '0.0.0',
                    collections: [],
                    fields: [],
                    relations: [],
                },
                schema: schemas_1.snapshotApplyTestSchema,
            });
            (0, vitest_1.expect)(createOneCollectionSpy).toHaveBeenCalledOnce();
            (0, vitest_1.expect)(createOneCollectionSpy).toHaveBeenCalledWith(expected, mutationOptions);
        });
    });
    (0, vitest_1.describe)('Delete collections', () => {
        (0, vitest_1.it)('Deletes interrelated collections', async () => {
            const snapshotToApply = {
                version: 1,
                directus: '0.0.0',
                collections: [],
                fields: [],
                relations: [],
            };
            // Stop call to db later on in apply-snapshot
            vitest_1.vi.spyOn(getSchema, 'getSchema').mockReturnValue(Promise.resolve(schemas_1.snapshotApplyTestSchema));
            // We are not actually testing that deleteOne works, just that is is called correctly
            const deleteOneCollectionSpy = vitest_1.vi.spyOn(services_1.CollectionsService.prototype, 'deleteOne').mockResolvedValue('test');
            await (0, apply_snapshot_1.applySnapshot)(snapshotToApply, {
                database: db,
                current: snapshots_1.snapshotBeforeDeleteCollection,
                schema: schemas_1.snapshotApplyTestSchema,
            });
            (0, vitest_1.expect)(deleteOneCollectionSpy).toHaveBeenCalledTimes(3);
        });
    });
});
