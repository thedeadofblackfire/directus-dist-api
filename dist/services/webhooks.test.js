"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const vitest_1 = require("vitest");
const _1 = require(".");
const messenger_1 = require("../messenger");
vitest_1.vi.mock('../../src/database/index', () => {
    return { __esModule: true, default: vitest_1.vi.fn(), getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres') };
});
vitest_1.vi.mock('../messenger', () => {
    return { getMessenger: vitest_1.vi.fn().mockReturnValue({ publish: vitest_1.vi.fn() }) };
});
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(async () => {
        db = (0, knex_1.default)({ client: knex_mock_client_1.MockClient });
        tracker = (0, knex_mock_client_1.createTracker)(db);
    });
    (0, vitest_1.beforeEach)(() => {
        tracker.on.any('directus_webhooks').response({});
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
    });
    (0, vitest_1.describe)('Services / Webhooks', () => {
        let service;
        let messengerPublishSpy;
        (0, vitest_1.beforeEach)(() => {
            service = new _1.WebhooksService({
                knex: db,
                schema: {
                    collections: {
                        directus_webhooks: {
                            collection: 'directus_webhooks',
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
            messengerPublishSpy = vitest_1.vi.spyOn((0, messenger_1.getMessenger)(), 'publish');
        });
        (0, vitest_1.afterEach)(() => {
            messengerPublishSpy.mockClear();
        });
        (0, vitest_1.describe)('createOne', () => {
            (0, vitest_1.it)('should publish webhooks reload message once', async () => {
                await service.createOne({});
                (0, vitest_1.expect)(messengerPublishSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('createMany', () => {
            (0, vitest_1.it)('should publish webhooks reload message once', async () => {
                await service.createMany([{}]);
                (0, vitest_1.expect)(messengerPublishSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateOne', () => {
            (0, vitest_1.it)('should publish webhooks reload message once', async () => {
                await service.updateOne(1, {});
                (0, vitest_1.expect)(messengerPublishSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateMany', () => {
            (0, vitest_1.it)('should publish webhooks reload message once', async () => {
                await service.updateMany([1], {});
                (0, vitest_1.expect)(messengerPublishSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteOne', () => {
            (0, vitest_1.it)('should publish webhooks reload message once', async () => {
                await service.deleteOne(1);
                (0, vitest_1.expect)(messengerPublishSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteMany', () => {
            (0, vitest_1.it)('should publish webhooks reload message once', async () => {
                await service.deleteMany([1]);
                (0, vitest_1.expect)(messengerPublishSpy).toBeCalledTimes(1);
            });
        });
    });
});
