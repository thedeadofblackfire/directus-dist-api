"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const exceptions_1 = require("../exceptions");
const items_1 = require("./items");
const permissions_1 = require("./permissions");
const presets_1 = require("./presets");
const users_1 = require("./users");
class RolesService extends items_1.ItemsService {
    constructor(options) {
        super('directus_roles', options);
    }
    async checkForOtherAdminRoles(excludeKeys) {
        // Make sure there's at least one admin role left after this deletion is done
        const otherAdminRoles = await this.knex
            .count('*', { as: 'count' })
            .from('directus_roles')
            .whereNotIn('id', excludeKeys)
            .andWhere({ admin_access: true })
            .first();
        const otherAdminRolesCount = +((otherAdminRoles === null || otherAdminRoles === void 0 ? void 0 : otherAdminRoles.count) || 0);
        if (otherAdminRolesCount === 0)
            throw new exceptions_1.UnprocessableEntityException(`You can't delete the last admin role.`);
    }
    async checkForOtherAdminUsers(key, users) {
        const role = await this.knex.select('admin_access').from('directus_roles').where('id', '=', key).first();
        if (!role)
            throw new exceptions_1.ForbiddenException();
        // The users that will now be in this new non-admin role
        let userKeys = [];
        if (Array.isArray(users)) {
            userKeys = users.map((user) => (typeof user === 'string' ? user : user.id)).filter((id) => id);
        }
        else {
            userKeys = users.update.map((user) => user.id).filter((id) => id);
        }
        const usersThatWereInRoleBefore = (await this.knex.select('id').from('directus_users').where('role', '=', key)).map((user) => user.id);
        const usersThatAreRemoved = usersThatWereInRoleBefore.filter((id) => Array.isArray(users) ? userKeys.includes(id) === false : users.delete.includes(id) === true);
        const usersThatAreAdded = Array.isArray(users) ? users : users.create;
        // If the role the users are moved to is an admin-role, and there's at least 1 (new) admin
        // user, we don't have to check for other admin
        // users
        if ((role.admin_access === true || role.admin_access === 1) && usersThatAreAdded.length > 0)
            return;
        const otherAdminUsers = await this.knex
            .count('*', { as: 'count' })
            .from('directus_users')
            .whereNotIn('directus_users.id', [...userKeys, ...usersThatAreRemoved])
            .andWhere({ 'directus_roles.admin_access': true })
            .leftJoin('directus_roles', 'directus_users.role', 'directus_roles.id')
            .first();
        const otherAdminUsersCount = +((otherAdminUsers === null || otherAdminUsers === void 0 ? void 0 : otherAdminUsers.count) || 0);
        if (otherAdminUsersCount === 0) {
            throw new exceptions_1.UnprocessableEntityException(`You can't remove the last admin user from the admin role.`);
        }
        return;
    }
    async updateOne(key, data, opts) {
        try {
            if ('users' in data) {
                await this.checkForOtherAdminUsers(key, data.users);
            }
        }
        catch (err) {
            (opts || (opts = {})).preMutationException = err;
        }
        return super.updateOne(key, data, opts);
    }
    async updateBatch(data, opts) {
        const primaryKeyField = this.schema.collections[this.collection].primary;
        const keys = data.map((item) => item[primaryKeyField]);
        const setsToNoAdmin = data.some((item) => item.admin_access === false);
        try {
            if (setsToNoAdmin) {
                await this.checkForOtherAdminRoles(keys);
            }
        }
        catch (err) {
            (opts || (opts = {})).preMutationException = err;
        }
        return super.updateBatch(data, opts);
    }
    async updateMany(keys, data, opts) {
        try {
            if ('admin_access' in data && data.admin_access === false) {
                await this.checkForOtherAdminRoles(keys);
            }
        }
        catch (err) {
            (opts || (opts = {})).preMutationException = err;
        }
        return super.updateMany(keys, data, opts);
    }
    async deleteOne(key) {
        await this.deleteMany([key]);
        return key;
    }
    async deleteMany(keys) {
        const opts = {};
        try {
            await this.checkForOtherAdminRoles(keys);
        }
        catch (err) {
            opts.preMutationException = err;
        }
        await this.knex.transaction(async (trx) => {
            const itemsService = new items_1.ItemsService('directus_roles', {
                knex: trx,
                accountability: this.accountability,
                schema: this.schema,
            });
            const permissionsService = new permissions_1.PermissionsService({
                knex: trx,
                accountability: this.accountability,
                schema: this.schema,
            });
            const presetsService = new presets_1.PresetsService({
                knex: trx,
                accountability: this.accountability,
                schema: this.schema,
            });
            const usersService = new users_1.UsersService({
                knex: trx,
                accountability: this.accountability,
                schema: this.schema,
            });
            // Delete permissions/presets for this role, suspend all remaining users in role
            await permissionsService.deleteByQuery({
                filter: { role: { _in: keys } },
            }, opts);
            await presetsService.deleteByQuery({
                filter: { role: { _in: keys } },
            }, opts);
            await usersService.updateByQuery({
                filter: { role: { _in: keys } },
            }, {
                status: 'suspended',
                role: null,
            }, opts);
            await itemsService.deleteMany(keys, opts);
        });
        return keys;
    }
    deleteByQuery(query, opts) {
        return super.deleteByQuery(query, opts);
    }
}
exports.RolesService = RolesService;
