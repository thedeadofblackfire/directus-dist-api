"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const run_1 = __importDefault(require("./run"));
const vitest_1 = require("vitest");
(0, vitest_1.describe)('run', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(() => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: knex_mock_client_1.MockClient }));
        tracker = (0, knex_mock_client_1.getTracker)();
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
    });
    (0, vitest_1.describe)('when passed the argument up', () => {
        (0, vitest_1.it)('returns "Nothing To Upgrade" if no directus_migrations', async () => {
            tracker.on.select('directus_migrations').response(['Empty']);
            await (0, run_1.default)(db, 'up').catch((e) => {
                (0, vitest_1.expect)(e).toBeInstanceOf(Error);
                (0, vitest_1.expect)(e.message).toBe('Nothing to upgrade');
            });
        });
        (0, vitest_1.it)('returns "Method implemented in the dialect driver" if no directus_migrations', async () => {
            tracker.on.select('directus_migrations').response([]);
            await (0, run_1.default)(db, 'up').catch((e) => {
                (0, vitest_1.expect)(e).toBeInstanceOf(Error);
                (0, vitest_1.expect)(e.message).toBe('Method implemented in the dialect driver');
            });
        });
        (0, vitest_1.it)('returns undefined if the migration is successful', async () => {
            tracker.on.select('directus_migrations').response([
                {
                    version: '20201028A',
                    name: 'Remove Collection Foreign Keys',
                    timestamp: '2021-11-27 11:36:56.471595-05',
                },
            ]);
            tracker.on.delete('directus_relations').response([]);
            tracker.on.insert('directus_migrations').response(['Remove System Relations', '20201029A']);
            (0, vitest_1.expect)(await (0, run_1.default)(db, 'up')).toBe(undefined);
        });
    });
    (0, vitest_1.describe)('when passed the argument down', () => {
        (0, vitest_1.it)('returns "Nothing To downgrade" if no valid directus_migrations', async () => {
            tracker.on.select('directus_migrations').response(['Empty']);
            await (0, run_1.default)(db, 'down').catch((e) => {
                (0, vitest_1.expect)(e).toBeInstanceOf(Error);
                (0, vitest_1.expect)(e.message).toBe(`Couldn't find migration`);
            });
        });
        (0, vitest_1.it)('returns "Method implemented in the dialect driver" if no directus_migrations', async () => {
            tracker.on.select('directus_migrations').response([]);
            await (0, run_1.default)(db, 'down').catch((e) => {
                (0, vitest_1.expect)(e).toBeInstanceOf(Error);
                (0, vitest_1.expect)(e.message).toBe('Nothing to downgrade');
            });
        });
        (0, vitest_1.it)(`returns "Couldn't find migration" if an invalid migration object is supplied`, async () => {
            tracker.on.select('directus_migrations').response([
                {
                    version: '202018129A',
                    name: 'Fake Migration',
                    timestamp: '2020-00-32 11:36:56.471595-05',
                },
            ]);
            await (0, run_1.default)(db, 'down').catch((e) => {
                (0, vitest_1.expect)(e).toBeInstanceOf(Error);
                (0, vitest_1.expect)(e.message).toBe(`Couldn't find migration`);
            });
        });
    });
    (0, vitest_1.describe)('when passed the argument latest', () => {
        (0, vitest_1.it)('returns "Nothing To downgrade" if no valid directus_migrations', async () => {
            tracker.on.select('directus_migrations').response(['Empty']);
            await (0, run_1.default)(db, 'latest').catch((e) => {
                (0, vitest_1.expect)(e).toBeInstanceOf(Error);
                (0, vitest_1.expect)(e.message).toBe(`Method implemented in the dialect driver`);
            });
        });
        (0, vitest_1.it)('returns "Method implemented in the dialect driver" if no directus_migrations', async () => {
            tracker.on.select('directus_migrations').response([]);
            await (0, run_1.default)(db, 'latest').catch((e) => {
                (0, vitest_1.expect)(e).toBeInstanceOf(Error);
                (0, vitest_1.expect)(e.message).toBe('Method implemented in the dialect driver');
            });
        });
    });
});
