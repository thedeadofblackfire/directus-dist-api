"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const merge_permissions_1 = require("../../src/utils/merge-permissions");
const vitest_1 = require("vitest");
const fullFilter = {};
const conditionalFilter = { user: { id: { _eq: '$CURRENT_USER' } } };
const conditionalFilter2 = { count: { _gt: 42 } };
const permissionTemplate = {
    role: null,
    collection: 'directus_users',
    permissions: null,
    validation: null,
    presets: null,
    fields: null,
};
(0, vitest_1.describe)('merging permissions', () => {
    (0, vitest_1.test)('processes _or permissions', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('or', { ...permissionTemplate, permissions: conditionalFilter }, { ...permissionTemplate, permissions: conditionalFilter2 });
        (0, vitest_1.expect)(mergedPermission).toStrictEqual({
            ...permissionTemplate,
            permissions: {
                _or: [conditionalFilter, conditionalFilter2],
            },
        });
    });
    (0, vitest_1.test)('processes _or validations', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('or', { ...permissionTemplate, validation: conditionalFilter }, { ...permissionTemplate, validation: conditionalFilter2 });
        (0, vitest_1.expect)(mergedPermission).toStrictEqual({
            ...permissionTemplate,
            validation: {
                _or: [conditionalFilter, conditionalFilter2],
            },
        });
    });
    (0, vitest_1.test)('processes _and permissions', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('and', { ...permissionTemplate, permissions: conditionalFilter }, { ...permissionTemplate, permissions: conditionalFilter2 });
        (0, vitest_1.expect)(mergedPermission).toStrictEqual({
            ...permissionTemplate,
            permissions: {
                _and: [conditionalFilter, conditionalFilter2],
            },
        });
    });
    (0, vitest_1.test)('processes _and validations', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('and', { ...permissionTemplate, validation: conditionalFilter }, { ...permissionTemplate, validation: conditionalFilter2 });
        (0, vitest_1.expect)(mergedPermission).toStrictEqual({
            ...permissionTemplate,
            validation: {
                _and: [conditionalFilter, conditionalFilter2],
            },
        });
    });
    (0, vitest_1.test)('{} supersedes conditional permissions in _or', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('or', { ...permissionTemplate, permissions: fullFilter }, { ...permissionTemplate, permissions: conditionalFilter });
        (0, vitest_1.expect)(mergedPermission).toStrictEqual({ ...permissionTemplate, permissions: fullFilter });
    });
    (0, vitest_1.test)('{} supersedes conditional validations in _or', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('or', { ...permissionTemplate, validation: fullFilter }, { ...permissionTemplate, validation: conditionalFilter });
        (0, vitest_1.expect)(mergedPermission).toStrictEqual({ ...permissionTemplate, validation: fullFilter });
    });
    (0, vitest_1.test)('{} does not supersede conditional permissions in _and', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('and', { ...permissionTemplate, permissions: fullFilter }, { ...permissionTemplate, permissions: conditionalFilter });
        const expectedPermission = {
            ...permissionTemplate,
            permissions: {
                _and: [fullFilter, conditionalFilter],
            },
        };
        (0, vitest_1.expect)(mergedPermission).toStrictEqual(expectedPermission);
    });
    (0, vitest_1.test)('{} does not supersede conditional validations in _and', () => {
        const mergedPermission = (0, merge_permissions_1.mergePermission)('and', { ...permissionTemplate, validation: fullFilter }, { ...permissionTemplate, validation: conditionalFilter });
        const expectedPermission = {
            ...permissionTemplate,
            validation: {
                _and: [fullFilter, conditionalFilter],
            },
        };
        (0, vitest_1.expect)(mergedPermission).toStrictEqual(expectedPermission);
    });
});
