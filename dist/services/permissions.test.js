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
const vitest_1 = require("vitest");
const _1 = require(".");
const cache = __importStar(require("../cache"));
vitest_1.vi.mock('../../src/database/index', () => {
    return { __esModule: true, default: vitest_1.vi.fn(), getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres') };
});
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(async () => {
        db = (0, knex_1.default)({ client: knex_mock_client_1.MockClient });
        tracker = (0, knex_mock_client_1.createTracker)(db);
    });
    (0, vitest_1.beforeEach)(() => {
        tracker.on.any('directus_permissions').response({});
        tracker.on
            .select(/"directus_permissions"."id" from "directus_permissions" order by "directus_permissions"."id" asc limit .*/)
            .response([]);
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
    });
    (0, vitest_1.describe)('Services / Permissions', () => {
        let service;
        let clearSystemCacheSpy;
        (0, vitest_1.beforeEach)(() => {
            service = new _1.PermissionsService({
                knex: db,
                schema: {
                    collections: {
                        directus_permissions: {
                            collection: 'directus_permissions',
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
                            },
                        },
                    },
                    relations: [],
                },
            });
            clearSystemCacheSpy = vitest_1.vi.spyOn(cache, 'clearSystemCache').mockResolvedValue();
        });
        (0, vitest_1.afterEach)(() => {
            clearSystemCacheSpy.mockClear();
        });
        (0, vitest_1.describe)('createOne', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.createOne({});
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('createMany', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.createMany([{}]);
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateOne', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.updateOne(1, {});
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateMany', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.updateMany([1], {});
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateBatch', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.updateBatch([{ id: 1 }]);
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateByQuery', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                // mock return value for following empty query
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, {});
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('upsertOne', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.upsertOne({});
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('upsertMany', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.upsertMany([{ id: 1 }]);
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteOne', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.deleteOne(1);
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteMany', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                await service.deleteMany([1]);
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteByQuery', () => {
            (0, vitest_1.it)('should clearSystemCache once', async () => {
                // mock return value for following empty query
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.deleteByQuery({});
                (0, vitest_1.expect)(clearSystemCacheSpy).toBeCalledTimes(1);
            });
        });
    });
});
