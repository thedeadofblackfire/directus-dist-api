"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const get_collection_from_alias_1 = require("./get-collection-from-alias");
(0, vitest_1.it)('Returns the correct collection', () => {
    const aliasMap = {
        author: { alias: 'aaaaa', collection: 'directus_users' },
        'author.role': { alias: 'bbbbb', collection: 'directus_roles' },
        'author.role.org': { alias: 'ccccc', collection: 'organisation' },
        'author.role.org.admin': { alias: 'ddddd', collection: 'directus_users' },
    };
    const collection = (0, get_collection_from_alias_1.getCollectionFromAlias)('ccccc', aliasMap);
    (0, vitest_1.expect)(collection).toBe('organisation');
});
(0, vitest_1.it)('Returns undefined if alias does not exist', () => {
    const aliasMap = {};
    const collection = (0, get_collection_from_alias_1.getCollectionFromAlias)('abcde', aliasMap);
    (0, vitest_1.expect)(collection).toBeUndefined();
});
