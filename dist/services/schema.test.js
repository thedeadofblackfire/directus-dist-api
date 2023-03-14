"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const vitest_1 = require("vitest");
const _1 = require(".");
const __1 = require("..");
const apply_diff_1 = require("../utils/apply-diff");
const get_snapshot_1 = require("../utils/get-snapshot");
vitest_1.vi.mock('../../package.json', () => ({ version: '0.0.0' }));
vitest_1.vi.mock('../../src/database/index', () => {
    return { __esModule: true, default: vitest_1.vi.fn(), getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres') };
});
vitest_1.vi.mock('../utils/get-snapshot', () => ({
    getSnapshot: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../utils/apply-diff', () => ({
    applyDiff: vitest_1.vi.fn(),
}));
class Client_PG extends knex_mock_client_1.MockClient {
}
let db;
let tracker;
const testSnapshot = {
    directus: '0.0.0',
    version: 1,
    vendor: 'postgres',
    collections: [],
    fields: [],
    relations: [],
};
const testCollectionDiff = {
    collection: 'test',
    diff: [
        {
            kind: 'N',
            rhs: {
                collection: 'test',
                meta: {
                    accountability: 'all',
                    collection: 'test',
                    group: null,
                    hidden: false,
                    icon: null,
                    item_duplication_fields: null,
                    note: null,
                    singleton: false,
                    translations: {},
                },
                schema: { name: 'test' },
            },
        },
    ],
};
(0, vitest_1.beforeAll)(() => {
    db = (0, knex_1.default)({ client: Client_PG });
    tracker = (0, knex_mock_client_1.getTracker)();
});
(0, vitest_1.afterEach)(() => {
    tracker.reset();
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.describe)('Services / Schema', () => {
    (0, vitest_1.describe)('snapshot', () => {
        (0, vitest_1.it)('should throw ForbiddenException for non-admin user', async () => {
            vitest_1.vi.mocked(get_snapshot_1.getSnapshot).mockResolvedValueOnce(testSnapshot);
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'test', admin: false } });
            (0, vitest_1.expect)(service.snapshot()).rejects.toThrowError(__1.ForbiddenException);
        });
        (0, vitest_1.it)('should return snapshot for admin user', async () => {
            vitest_1.vi.mocked(get_snapshot_1.getSnapshot).mockResolvedValueOnce(testSnapshot);
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'admin', admin: true } });
            (0, vitest_1.expect)(service.snapshot()).resolves.toEqual(testSnapshot);
        });
    });
    (0, vitest_1.describe)('apply', () => {
        const snapshotDiffWithHash = {
            hash: '813b3cdf7013310fafde7813b7d5e6bd4eb1e73f',
            diff: {
                collections: [testCollectionDiff],
                fields: [],
                relations: [],
            },
        };
        (0, vitest_1.it)('should throw ForbiddenException for non-admin user', async () => {
            vitest_1.vi.mocked(get_snapshot_1.getSnapshot).mockResolvedValueOnce(testSnapshot);
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'test', admin: false } });
            (0, vitest_1.expect)(service.apply(snapshotDiffWithHash)).rejects.toThrowError(__1.ForbiddenException);
            (0, vitest_1.expect)(vitest_1.vi.mocked(apply_diff_1.applyDiff)).not.toHaveBeenCalledOnce();
        });
        (0, vitest_1.it)('should apply for admin user', async () => {
            vitest_1.vi.mocked(get_snapshot_1.getSnapshot).mockResolvedValueOnce(testSnapshot);
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'admin', admin: true } });
            await service.apply(snapshotDiffWithHash);
            (0, vitest_1.expect)(vitest_1.vi.mocked(apply_diff_1.applyDiff)).toHaveBeenCalledOnce();
        });
    });
    (0, vitest_1.describe)('diff', () => {
        const snapshotToApply = {
            directus: '0.0.0',
            version: 1,
            vendor: 'postgres',
            collections: [
                {
                    collection: 'test',
                    meta: {
                        accountability: 'all',
                        collection: 'test',
                        group: null,
                        hidden: false,
                        icon: null,
                        item_duplication_fields: null,
                        note: null,
                        singleton: false,
                        translations: {},
                    },
                    schema: {
                        name: 'test',
                    },
                },
            ],
            fields: [],
            relations: [],
        };
        (0, vitest_1.it)('should throw ForbiddenException for non-admin user', async () => {
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'test', admin: false } });
            (0, vitest_1.expect)(service.diff(snapshotToApply, { currentSnapshot: testSnapshot, force: true })).rejects.toThrowError(__1.ForbiddenException);
        });
        (0, vitest_1.it)('should return diff for admin user', async () => {
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'admin', admin: true } });
            (0, vitest_1.expect)(service.diff(snapshotToApply, { currentSnapshot: testSnapshot, force: true })).resolves.toEqual({
                collections: [testCollectionDiff],
                fields: [],
                relations: [],
            });
        });
        (0, vitest_1.it)('should return null for empty diff', async () => {
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'admin', admin: true } });
            (0, vitest_1.expect)(service.diff(testSnapshot, { currentSnapshot: testSnapshot, force: true })).resolves.toBeNull();
        });
    });
    (0, vitest_1.describe)('getHashedSnapshot', () => {
        (0, vitest_1.it)('should return snapshot for admin user', async () => {
            const service = new _1.SchemaService({ knex: db, accountability: { role: 'admin', admin: true } });
            (0, vitest_1.expect)(service.getHashedSnapshot(testSnapshot)).toEqual(vitest_1.expect.objectContaining({
                ...testSnapshot,
                hash: vitest_1.expect.any(String),
            }));
        });
    });
});
