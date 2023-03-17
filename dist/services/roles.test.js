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
vitest_1.vi.mock('../../src/database/index', () => {
    return { __esModule: true, default: vitest_1.vi.fn(), getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres') };
});
const testSchema = {
    collections: {
        directus_roles: {
            collection: 'directus_roles',
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
                    type: 'uuid',
                    dbType: 'uuid',
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
};
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(async () => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: knex_mock_client_1.MockClient }));
        tracker = (0, knex_mock_client_1.createTracker)(db);
    });
    (0, vitest_1.beforeEach)(() => {
        tracker.on.any('directus_roles').response({});
        tracker.on
            .select(/"directus_roles"."id" from "directus_roles" order by "directus_roles"."id" asc limit .*/)
            .response([]);
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
    });
    (0, vitest_1.describe)('Services / RolesService', () => {
        (0, vitest_1.describe)('updateOne', () => {
            let service;
            let superUpdateOne;
            const adminRoleId = 'cbfd1e77-b883-4090-93e4-5bcbfbd48aba';
            const userId1 = '07a5fee0-c168-49e2-8e33-4bae280e0c48';
            const userId2 = 'abedf9a4-6956-4a9c-8904-c1aa08a68173';
            (0, vitest_1.beforeEach)(() => {
                service = new _1.RolesService({
                    knex: db,
                    schema: testSchema,
                });
                superUpdateOne = vitest_1.vi.spyOn(_1.ItemsService.prototype, 'updateOne');
            });
            (0, vitest_1.afterEach)(() => {
                superUpdateOne.mockRestore();
            });
            (0, vitest_1.describe)('checkForOtherAdminUsers', () => {
                (0, vitest_1.describe)('on an admin role', () => {
                    const admin_access = true;
                    (0, vitest_1.describe)('with an array of user ids', () => {
                        (0, vitest_1.it)('having an added user', async () => {
                            const data = {
                                users: [userId1, userId2],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed user', async () => {
                            const data = {
                                users: [userId1],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on
                                .select('select "id" from "directus_users" where "role" = ?')
                                .responseOnce([{ id: userId1 }, { id: userId2 }]);
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed last user that is not the last admin of system', async () => {
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed a last user that is the last admin of system', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                    });
                    (0, vitest_1.describe)('with an array of user objects', () => {
                        (0, vitest_1.it)('having an added user', async () => {
                            const data = {
                                users: [{ id: userId1 }, { id: userId2 }],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed user', async () => {
                            const data = {
                                users: [{ id: userId1 }],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on
                                .select('select "id" from "directus_users" where "role" = ?')
                                .responseOnce([{ id: userId1 }, { id: userId2 }]);
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed last user that is not the last admin of system', async () => {
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed a last user that is the last admin of system', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                    });
                    (0, vitest_1.describe)('with an alterations object', () => {
                        (0, vitest_1.it)('having a newly created user', async () => {
                            const data = {
                                users: {
                                    create: [{ name: 'New User' }],
                                    update: [],
                                    delete: [],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having an added user', async () => {
                            const data = {
                                users: {
                                    create: [],
                                    update: [{ role: adminRoleId, id: userId2 }],
                                    delete: [],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed user', async () => {
                            const data = {
                                users: {
                                    create: [],
                                    update: [],
                                    delete: [userId2],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on
                                .select('select "id" from "directus_users" where "role" = ?')
                                .responseOnce([{ id: userId1 }, { id: userId2 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed last user that is not the last admin of system', async () => {
                            const data = {
                                users: {
                                    create: [],
                                    update: [],
                                    delete: [userId1],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed a last user that is the last admin of system', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: {
                                    create: [],
                                    update: [],
                                    delete: [userId1],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                    });
                });
                (0, vitest_1.describe)('on an non-admin role', () => {
                    const admin_access = false;
                    (0, vitest_1.describe)('with an array of user ids', () => {
                        (0, vitest_1.it)('having an added user', async () => {
                            const data = {
                                users: [userId1, userId2],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having an added user that is the last admin', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: [userId1, userId2],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                        (0, vitest_1.it)('having a removed user', async () => {
                            const data = {
                                users: [userId1],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on
                                .select('select "id" from "directus_users" where "role" = ?')
                                .responseOnce([{ id: userId1 }, { id: userId2 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed last user that is not the last admin of system', async () => {
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed a last user that is the last admin of system', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                    });
                    (0, vitest_1.describe)('with an array of user objects', () => {
                        (0, vitest_1.it)('having an added user', async () => {
                            const data = {
                                users: [{ id: userId1 }, { id: userId2 }],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having an added user that is the last admin', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: [{ id: userId1 }, { id: userId2 }],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                        (0, vitest_1.it)('having a removed user', async () => {
                            const data = {
                                users: [{ id: userId1 }],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on
                                .select('select "id" from "directus_users" where "role" = ?')
                                .responseOnce([{ id: userId1 }, { id: userId2 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed last user that is not the last admin of system', async () => {
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed a last user that is the last admin of system', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: [],
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                    });
                    (0, vitest_1.describe)('with an alterations object', () => {
                        (0, vitest_1.it)('having a newly created user', async () => {
                            const data = {
                                users: {
                                    create: [{ name: 'New User' }],
                                    update: [],
                                    delete: [],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having an added user', async () => {
                            const data = {
                                users: {
                                    create: [],
                                    update: [{ role: adminRoleId, id: userId2 }],
                                    delete: [],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having an added user that is the last admin', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: {
                                    create: [],
                                    update: [{ role: adminRoleId, id: userId2 }],
                                    delete: [],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                        (0, vitest_1.it)('having a removed user', async () => {
                            const data = {
                                users: {
                                    create: [],
                                    update: [],
                                    delete: [userId2],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on
                                .select('select "id" from "directus_users" where "role" = ?')
                                .responseOnce([{ id: userId1 }, { id: userId2 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed last user that is not the last admin of system', async () => {
                            const data = {
                                users: {
                                    create: [],
                                    update: [],
                                    delete: [userId1],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 1 });
                            const result = await service.updateOne(adminRoleId, data);
                            (0, vitest_1.expect)(result).toBe(adminRoleId);
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalledOnce();
                        });
                        (0, vitest_1.it)('having a removed a last user that is the last admin of system', async () => {
                            const service = new _1.RolesService({
                                knex: db,
                                schema: testSchema,
                                accountability: { role: 'test', admin: false },
                            });
                            const data = {
                                users: {
                                    create: [],
                                    update: [],
                                    delete: [userId1],
                                },
                            };
                            tracker.on.select('select "admin_access" from "directus_roles"').responseOnce({ admin_access });
                            tracker.on.select('select "id" from "directus_users" where "role" = ?').responseOnce([{ id: userId1 }]);
                            tracker.on.select('select count(*) as "count" from "directus_users"').responseOnce({ count: 0 });
                            const promise = service.updateOne(adminRoleId, data);
                            vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                            try {
                                await promise;
                            }
                            catch (err) {
                                (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                                (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                            }
                            (0, vitest_1.expect)(superUpdateOne).toHaveBeenCalled();
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException.message).toBe(`You can't remove the last admin user from the admin role.`);
                            (0, vitest_1.expect)(superUpdateOne.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.UnprocessableEntityException);
                        });
                    });
                });
            });
        });
    });
    (0, vitest_1.describe)('Services / Roles', () => {
        let service;
        let checkForOtherAdminRolesSpy;
        let checkForOtherAdminUsersSpy;
        (0, vitest_1.beforeEach)(() => {
            service = new _1.RolesService({
                knex: db,
                schema: {
                    collections: {
                        directus_roles: {
                            collection: 'directus_roles',
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
            vitest_1.vi.spyOn(_1.PermissionsService.prototype, 'deleteByQuery').mockResolvedValueOnce([]);
            vitest_1.vi.spyOn(_1.PresetsService.prototype, 'deleteByQuery').mockResolvedValueOnce([]);
            vitest_1.vi.spyOn(_1.UsersService.prototype, 'updateByQuery').mockResolvedValueOnce([]);
            vitest_1.vi.spyOn(_1.UsersService.prototype, 'deleteByQuery').mockResolvedValueOnce([]);
            // "as any" are needed since these are private methods
            checkForOtherAdminRolesSpy = vitest_1.vi
                .spyOn(_1.RolesService.prototype, 'checkForOtherAdminRoles')
                .mockResolvedValueOnce(true);
            checkForOtherAdminUsersSpy = vitest_1.vi
                .spyOn(_1.RolesService.prototype, 'checkForOtherAdminUsers')
                .mockResolvedValueOnce(true);
        });
        (0, vitest_1.afterEach)(() => {
            checkForOtherAdminRolesSpy.mockRestore();
            checkForOtherAdminUsersSpy.mockRestore();
        });
        (0, vitest_1.describe)('createOne', () => {
            (0, vitest_1.it)('should not checkForOtherAdminRoles', async () => {
                await service.createOne({});
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).not.toBeCalled();
            });
        });
        (0, vitest_1.describe)('createMany', () => {
            (0, vitest_1.it)('should not checkForOtherAdminRoles', async () => {
                await service.createMany([{}]);
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).not.toBeCalled();
            });
        });
        (0, vitest_1.describe)('updateOne', () => {
            (0, vitest_1.it)('should not checkForOtherAdminRoles', async () => {
                await service.updateOne(1, {});
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkForOtherAdminRoles once and not checkForOtherAdminUsersSpy', async () => {
                await service.updateOne(1, { admin_access: false });
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
                (0, vitest_1.expect)(checkForOtherAdminUsersSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkForOtherAdminRoles and checkForOtherAdminUsersSpy once', async () => {
                await service.updateOne(1, { admin_access: false, users: [1] });
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
                (0, vitest_1.expect)(checkForOtherAdminUsersSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateMany', () => {
            (0, vitest_1.it)('should not checkForOtherAdminRoles', async () => {
                await service.updateMany([1], {});
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkForOtherAdminRoles once', async () => {
                await service.updateMany([1], { admin_access: false });
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateBatch', () => {
            (0, vitest_1.it)('should not checkForOtherAdminRoles', async () => {
                await service.updateBatch([{ id: 1 }]);
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkForOtherAdminRoles once', async () => {
                await service.updateBatch([{ id: 1, admin_access: false }]);
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateByQuery', () => {
            (0, vitest_1.it)('should not checkForOtherAdminRoles', async () => {
                // mock return value for the following empty query
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValueOnce([1]);
                await service.updateByQuery({}, {});
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkForOtherAdminRoles once', async () => {
                // mock return value for the following empty query
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValueOnce([1]);
                await service.updateByQuery({}, { admin_access: false });
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteOne', () => {
            (0, vitest_1.it)('should checkForOtherAdminRoles once', async () => {
                await service.deleteOne(1);
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteMany', () => {
            (0, vitest_1.it)('should checkForOtherAdminRoles once', async () => {
                await service.deleteMany([1]);
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteByQuery', () => {
            (0, vitest_1.it)('should checkForOtherAdminRoles once', async () => {
                // mock return value for the following empty query
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValueOnce([1]);
                await service.deleteByQuery({});
                (0, vitest_1.expect)(checkForOtherAdminRolesSpy).toBeCalledTimes(1);
            });
        });
    });
});
