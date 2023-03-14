"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const services_1 = require("../../services");
const get_accountability_for_role_1 = require("../../utils/get-accountability-for-role");
const sanitize_query_1 = require("../../utils/sanitize-query");
exports.default = (0, utils_1.defineOperationApi)({
    id: 'item-read',
    handler: async ({ collection, key, query, emitEvents, permissions }, { accountability, database, getSchema }) => {
        const schema = await getSchema({ database });
        let customAccountability;
        if (!permissions || permissions === '$trigger') {
            customAccountability = accountability;
        }
        else if (permissions === '$full') {
            customAccountability = await (0, get_accountability_for_role_1.getAccountabilityForRole)('system', { database, schema, accountability });
        }
        else if (permissions === '$public') {
            customAccountability = await (0, get_accountability_for_role_1.getAccountabilityForRole)(null, { database, schema, accountability });
        }
        else {
            customAccountability = await (0, get_accountability_for_role_1.getAccountabilityForRole)(permissions, { database, schema, accountability });
        }
        const itemsService = new services_1.ItemsService(collection, {
            schema,
            accountability: customAccountability,
            knex: database,
        });
        const queryObject = query ? (0, utils_1.optionToObject)(query) : {};
        const sanitizedQueryObject = (0, sanitize_query_1.sanitizeQuery)(queryObject, customAccountability);
        let result;
        if (!key || (Array.isArray(key) && key.length === 0)) {
            result = await itemsService.readByQuery(sanitizedQueryObject, { emitEvents: !!emitEvents });
        }
        else {
            const keys = (0, utils_1.toArray)(key);
            if (keys.length === 1) {
                result = await itemsService.readOne(keys[0], sanitizedQueryObject, { emitEvents: !!emitEvents });
            }
            else {
                result = await itemsService.readMany(keys, sanitizedQueryObject, { emitEvents: !!emitEvents });
            }
        }
        return result;
    },
});
