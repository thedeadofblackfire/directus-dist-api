"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const filter_items_1 = require("../../src/utils/filter-items");
const vitest_1 = require("vitest");
const items = [
    {
        role: '9bc9fea0-f761-4107-bfb7-b3d06c125e98',
        permissions: {},
        validation: null,
        presets: null,
        fields: ['*'],
        system: true,
        collection: 'directus_settings',
        action: 'read',
    },
    {
        role: '9bc9fea0-f761-4107-bfb7-b3d06c125e98',
        permissions: {
            user: {
                _eq: '$CURRENT_USER',
            },
        },
        validation: null,
        presets: null,
        fields: ['*'],
        system: true,
        collection: 'directus_presets',
        action: 'delete',
    },
];
(0, vitest_1.describe)('filter items', () => {
    (0, vitest_1.test)('return items when no filter', () => {
        const result = (0, filter_items_1.filterItems)(items, undefined);
        (0, vitest_1.expect)(result).toStrictEqual(items);
    });
    (0, vitest_1.test)('return items when empty filter used', () => {
        const result = (0, filter_items_1.filterItems)(items, {});
        (0, vitest_1.expect)(result).toStrictEqual(items);
    });
    (0, vitest_1.test)('return filtered items when nested empty filter used', () => {
        const result = (0, filter_items_1.filterItems)(items, {
            _and: [
                {
                    action: {
                        _eq: 'read',
                    },
                },
                {},
            ],
        });
        (0, vitest_1.expect)(result).toStrictEqual(items.filter((item) => item.action === 'read'));
    });
    (0, vitest_1.test)('return filtered items', () => {
        const result = (0, filter_items_1.filterItems)(items, {
            action: {
                _eq: 'read',
            },
        });
        (0, vitest_1.expect)(result).toStrictEqual(items.filter((item) => item.action === 'read'));
    });
});
