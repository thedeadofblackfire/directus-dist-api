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
const record_not_unique_1 = require("../exceptions/database/record-not-unique");
vitest_1.vi.mock('../../src/database/index', () => ({
    default: vitest_1.vi.fn(),
    getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres'),
}));
const testRoleId = '4ccdb196-14b3-4ed1-b9da-c1978be07ca2';
const testSchema = {
    collections: {
        directus_users: {
            collection: 'directus_users',
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
};
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(async () => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: knex_mock_client_1.MockClient }));
        tracker = (0, knex_mock_client_1.createTracker)(db);
    });
    (0, vitest_1.beforeEach)(() => {
        tracker.on.any('directus_users').response({});
        // mock notifications update query in deleteOne/deleteMany/deleteByQuery methods
        tracker.on.update('directus_notifications').response({});
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
    });
    (0, vitest_1.describe)('Services / Users', () => {
        let service;
        let superUpdateManySpy;
        let checkUniqueEmailsSpy;
        let checkPasswordPolicySpy;
        let checkRemainingAdminExistenceSpy;
        let checkRemainingActiveAdminSpy;
        (0, vitest_1.beforeEach)(() => {
            service = new _1.UsersService({
                knex: db,
                schema: {
                    collections: {
                        directus_users: {
                            collection: 'directus_users',
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
            superUpdateManySpy = vitest_1.vi.spyOn(_1.ItemsService.prototype, 'updateMany');
            // "as any" are needed since these are private methods
            checkUniqueEmailsSpy = vitest_1.vi
                .spyOn(_1.UsersService.prototype, 'checkUniqueEmails')
                .mockImplementation(() => vitest_1.vi.fn());
            checkPasswordPolicySpy = vitest_1.vi
                .spyOn(_1.UsersService.prototype, 'checkPasswordPolicy')
                .mockResolvedValue(() => vitest_1.vi.fn());
            checkRemainingAdminExistenceSpy = vitest_1.vi
                .spyOn(_1.UsersService.prototype, 'checkRemainingAdminExistence')
                .mockResolvedValue(() => vitest_1.vi.fn());
            checkRemainingActiveAdminSpy = vitest_1.vi
                .spyOn(_1.UsersService.prototype, 'checkRemainingActiveAdmin')
                .mockResolvedValue(() => vitest_1.vi.fn());
        });
        (0, vitest_1.afterEach)(() => {
            checkUniqueEmailsSpy.mockClear();
            checkPasswordPolicySpy.mockClear();
            checkRemainingAdminExistenceSpy.mockClear();
            checkRemainingActiveAdminSpy.mockClear();
        });
        (0, vitest_1.describe)('createOne', () => {
            (0, vitest_1.it)('should not checkUniqueEmails', async () => {
                await service.createOne({});
                (0, vitest_1.expect)(checkUniqueEmailsSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkUniqueEmails once', async () => {
                await service.createOne({ email: 'test@example.com' });
                (0, vitest_1.expect)(checkUniqueEmailsSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkPasswordPolicy', async () => {
                await service.createOne({});
                (0, vitest_1.expect)(checkPasswordPolicySpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkPasswordPolicy once', async () => {
                await service.createOne({ password: 'testpassword' });
                (0, vitest_1.expect)(checkPasswordPolicySpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('createMany', () => {
            (0, vitest_1.it)('should not checkUniqueEmails', async () => {
                await service.createMany([{}]);
                (0, vitest_1.expect)(checkUniqueEmailsSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkUniqueEmails once', async () => {
                await service.createMany([{ email: 'test@example.com' }]);
                (0, vitest_1.expect)(checkUniqueEmailsSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkPasswordPolicy', async () => {
                await service.createMany([{}]);
                (0, vitest_1.expect)(checkPasswordPolicySpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkPasswordPolicy once', async () => {
                await service.createMany([{ password: 'testpassword' }]);
                (0, vitest_1.expect)(checkPasswordPolicySpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('updateOne', () => {
            (0, vitest_1.it)('should not checkRemainingAdminExistence', async () => {
                // mock newRole query in updateMany (called by ItemsService updateOne)
                tracker.on.select(/select "admin_access" from "directus_roles"/).response({ admin_access: true });
                await service.updateOne(1, { role: testRoleId });
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkRemainingAdminExistence once', async () => {
                // mock newRole query in updateMany (called by ItemsService updateOne)
                tracker.on.select(/select "admin_access" from "directus_roles"/).response({ admin_access: false });
                await service.updateOne(1, { role: testRoleId });
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkRemainingActiveAdmin', async () => {
                await service.updateOne(1, {});
                (0, vitest_1.expect)(checkRemainingActiveAdminSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkRemainingActiveAdmin once', async () => {
                await service.updateOne(1, { status: 'inactive' });
                (0, vitest_1.expect)(checkRemainingActiveAdminSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkUniqueEmails', async () => {
                await service.updateOne(1, {});
                (0, vitest_1.expect)(checkUniqueEmailsSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkUniqueEmails once', async () => {
                await service.updateOne(1, { email: 'test@example.com' });
                (0, vitest_1.expect)(checkUniqueEmailsSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkPasswordPolicy', async () => {
                await service.updateOne(1, {});
                (0, vitest_1.expect)(checkPasswordPolicySpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkPasswordPolicy once', async () => {
                await service.updateOne(1, { password: 'testpassword' });
                (0, vitest_1.expect)(checkPasswordPolicySpy).toBeCalledTimes(1);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should throw InvalidPayloadException for non-admin users when updating "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'test', admin: false },
                });
                const promise = service.updateOne(1, { [field]: 'test' });
                vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                try {
                    await promise;
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                }
                (0, vitest_1.expect)(superUpdateManySpy).toHaveBeenCalled();
                (0, vitest_1.expect)(superUpdateManySpy.mock.lastCall[2].preMutationException.message).toBe(`You can't change the "${field}" value manually.`);
                (0, vitest_1.expect)(superUpdateManySpy.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.InvalidPayloadException);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should allow admin users to update "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'admin', admin: true },
                });
                const promise = service.updateOne(1, { [field]: 'test' });
                await (0, vitest_1.expect)(promise).resolves.not.toThrow();
                (0, vitest_1.expect)(superUpdateManySpy).toBeCalledWith([1], vitest_1.expect.objectContaining({ auth_data: null }), undefined);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should allow null accountability to update "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                });
                const promise = service.updateOne(1, { [field]: 'test' });
                await (0, vitest_1.expect)(promise).resolves.not.toThrow();
                (0, vitest_1.expect)(superUpdateManySpy).toBeCalledWith([1], vitest_1.expect.objectContaining({ auth_data: null }), undefined);
            });
        });
        (0, vitest_1.describe)('updateMany', () => {
            (0, vitest_1.it)('should not checkRemainingAdminExistence', async () => {
                // mock newRole query in updateMany
                tracker.on.select(/select "admin_access" from "directus_roles"/).response({ admin_access: true });
                await service.updateMany([1], { role: testRoleId });
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkRemainingAdminExistence once', async () => {
                // mock newRole query in updateMany
                tracker.on.select(/select "admin_access" from "directus_roles"/).response({ admin_access: false });
                await service.updateMany([1], { role: testRoleId });
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkRemainingActiveAdmin', async () => {
                await service.updateMany([1], {});
                (0, vitest_1.expect)(checkRemainingActiveAdminSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkRemainingActiveAdmin once', async () => {
                await service.updateMany([1], { status: 'inactive' });
                (0, vitest_1.expect)(checkRemainingActiveAdminSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkUniqueEmails', async () => {
                await service.updateMany([1], {});
                (0, vitest_1.expect)(checkUniqueEmailsSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkUniqueEmails once', async () => {
                await service.updateMany([1], { email: 'test@example.com' });
                (0, vitest_1.expect)(checkUniqueEmailsSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should throw RecordNotUniqueException for multiple keys with same email', async () => {
                vitest_1.expect.assertions(2); // to ensure both assertions in the catch block are reached
                try {
                    await service.updateMany([1, 2], { email: 'test@example.com' });
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`Field "email" has to be unique.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(record_not_unique_1.RecordNotUniqueException);
                }
            });
            (0, vitest_1.it)('should not checkPasswordPolicy', async () => {
                await service.updateMany([1], {});
                (0, vitest_1.expect)(checkPasswordPolicySpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkPasswordPolicy once', async () => {
                await service.updateMany([1], { password: 'testpassword' });
                (0, vitest_1.expect)(checkPasswordPolicySpy).toBeCalledTimes(1);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should throw InvalidPayloadException for non-admin users when updating "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'test', admin: false },
                });
                const promise = service.updateMany([1], { [field]: 'test' });
                vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                try {
                    await promise;
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                }
                (0, vitest_1.expect)(superUpdateManySpy).toHaveBeenCalled();
                (0, vitest_1.expect)(superUpdateManySpy.mock.lastCall[2].preMutationException.message).toBe(`You can't change the "${field}" value manually.`);
                (0, vitest_1.expect)(superUpdateManySpy.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.InvalidPayloadException);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should allow admin users to update "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'admin', admin: true },
                });
                const promise = service.updateMany([1], { [field]: 'test' });
                await (0, vitest_1.expect)(promise).resolves.not.toThrow();
                (0, vitest_1.expect)(superUpdateManySpy).toBeCalledWith([1], vitest_1.expect.objectContaining({ auth_data: null }), undefined);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should allow null accountability to update "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                });
                const promise = service.updateMany([1], { [field]: 'test' });
                await (0, vitest_1.expect)(promise).resolves.not.toThrow();
                (0, vitest_1.expect)(superUpdateManySpy).toBeCalledWith([1], vitest_1.expect.objectContaining({ auth_data: null }), undefined);
            });
        });
        (0, vitest_1.describe)('updateByQuery', () => {
            (0, vitest_1.it)('should not checkRemainingAdminExistence', async () => {
                // mock newRole query in updateMany (called by ItemsService updateByQuery)
                tracker.on.select(/select "admin_access" from "directus_roles"/).response({ admin_access: true });
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, { role: testRoleId });
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkRemainingAdminExistence once', async () => {
                // mock newRole query in updateMany (called by ItemsService updateByQuery)
                tracker.on.select(/select "admin_access" from "directus_roles"/).response({ admin_access: false });
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, { role: testRoleId });
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkRemainingActiveAdmin', async () => {
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, {});
                (0, vitest_1.expect)(checkRemainingActiveAdminSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkRemainingActiveAdmin once', async () => {
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, { status: 'inactive' });
                (0, vitest_1.expect)(checkRemainingActiveAdminSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should not checkUniqueEmails', async () => {
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, {});
                (0, vitest_1.expect)(checkUniqueEmailsSpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkUniqueEmails once', async () => {
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, { email: 'test@example.com' });
                (0, vitest_1.expect)(checkUniqueEmailsSpy).toBeCalledTimes(1);
            });
            (0, vitest_1.it)('should throw RecordNotUniqueException for multiple keys with same email', async () => {
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1, 2]);
                vitest_1.expect.assertions(2); // to ensure both assertions in the catch block are reached
                try {
                    await service.updateByQuery({}, { email: 'test@example.com' });
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`Field "email" has to be unique.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(record_not_unique_1.RecordNotUniqueException);
                }
            });
            (0, vitest_1.it)('should not checkPasswordPolicy', async () => {
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, {});
                (0, vitest_1.expect)(checkPasswordPolicySpy).not.toBeCalled();
            });
            (0, vitest_1.it)('should checkPasswordPolicy once', async () => {
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                await service.updateByQuery({}, { password: 'testpassword' });
                (0, vitest_1.expect)(checkPasswordPolicySpy).toBeCalledTimes(1);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should throw InvalidPayloadException for non-admin users when updating "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'test', admin: false },
                });
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                const promise = service.updateByQuery({}, { [field]: 'test' });
                vitest_1.expect.assertions(5); // to ensure both assertions in the catch block are reached
                try {
                    await promise;
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                }
                (0, vitest_1.expect)(superUpdateManySpy).toHaveBeenCalled();
                (0, vitest_1.expect)(superUpdateManySpy.mock.lastCall[2].preMutationException.message).toBe(`You can't change the "${field}" value manually.`);
                (0, vitest_1.expect)(superUpdateManySpy.mock.lastCall[2].preMutationException).toBeInstanceOf(exceptions_1.InvalidPayloadException);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should allow admin users to update "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'admin', admin: true },
                });
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                const promise = service.updateByQuery({}, { [field]: 'test' });
                await (0, vitest_1.expect)(promise).resolves.not.toThrow();
                (0, vitest_1.expect)(superUpdateManySpy).toBeCalledWith([1], vitest_1.expect.objectContaining({ auth_data: null }), undefined);
            });
            vitest_1.it.each(['provider', 'external_identifier'])('should allow null accountability to update "%s" field', async (field) => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                });
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'getKeysByQuery').mockResolvedValue([1]);
                const promise = service.updateByQuery({}, { [field]: 'test' });
                await (0, vitest_1.expect)(promise).resolves.not.toThrow();
                (0, vitest_1.expect)(superUpdateManySpy).toBeCalledWith([1], vitest_1.expect.objectContaining({ auth_data: null }), undefined);
            });
        });
        (0, vitest_1.describe)('deleteOne', () => {
            (0, vitest_1.it)('should checkRemainingAdminExistence once', async () => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'test', admin: false },
                });
                const promise = service.deleteOne(1);
                vitest_1.expect.assertions(3); // to ensure both assertions in the catch block are reached
                try {
                    await promise;
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                }
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteMany', () => {
            (0, vitest_1.it)('should checkRemainingAdminExistence once', async () => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'test', admin: false },
                });
                const promise = service.deleteMany([1]);
                vitest_1.expect.assertions(3); // to ensure both assertions in the catch block are reached
                try {
                    await promise;
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                }
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).toBeCalledTimes(1);
            });
        });
        (0, vitest_1.describe)('deleteByQuery', () => {
            (0, vitest_1.it)('should checkRemainingAdminExistence once', async () => {
                const service = new _1.UsersService({
                    knex: db,
                    schema: testSchema,
                    accountability: { role: 'test', admin: false },
                });
                // mock return value for the following empty query
                vitest_1.vi.spyOn(_1.ItemsService.prototype, 'readByQuery').mockResolvedValueOnce([{ id: 1 }]);
                const promise = service.deleteByQuery({ filter: { id: { _eq: 1 } } });
                vitest_1.expect.assertions(3); // to ensure both assertions in the catch block are reached
                try {
                    await promise;
                }
                catch (err) {
                    (0, vitest_1.expect)(err.message).toBe(`You don't have permission to access this.`);
                    (0, vitest_1.expect)(err).toBeInstanceOf(exceptions_1.ForbiddenException);
                }
                (0, vitest_1.expect)(checkRemainingAdminExistenceSpy).toBeCalledTimes(1);
            });
        });
    });
});
