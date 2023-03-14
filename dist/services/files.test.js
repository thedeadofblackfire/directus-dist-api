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
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(() => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: knex_mock_client_1.MockClient }));
        tracker = (0, knex_mock_client_1.getTracker)();
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Services / Files', () => {
        (0, vitest_1.describe)('createOne', () => {
            let service;
            let superCreateOne;
            (0, vitest_1.beforeEach)(() => {
                service = new _1.FilesService({
                    knex: db,
                    schema: { collections: {}, relations: [] },
                });
                superCreateOne = vitest_1.vi.spyOn(_1.ItemsService.prototype, 'createOne').mockReturnValue(Promise.resolve(1));
            });
            (0, vitest_1.it)('throws InvalidPayloadException when "type" is not provided', async () => {
                try {
                    await service.createOne({
                        title: 'Test File',
                        storage: 'local',
                        filename_download: 'test_file',
                    });
                }
                catch (err) {
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.InvalidPayloadException);
                    (0, vitest_1.expect)(err.message).toBe('"type" is required');
                }
                (0, vitest_1.expect)(superCreateOne).not.toHaveBeenCalled();
            });
            (0, vitest_1.it)('creates a file entry when "type" is provided', async () => {
                await service.createOne({
                    title: 'Test File',
                    storage: 'local',
                    filename_download: 'test_file',
                    type: 'application/octet-stream',
                });
                (0, vitest_1.expect)(superCreateOne).toHaveBeenCalled();
            });
        });
    });
});
