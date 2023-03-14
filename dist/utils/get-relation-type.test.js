"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_relation_type_1 = require("../../src/utils/get-relation-type");
const vitest_1 = require("vitest");
(0, vitest_1.test)('Returns null if no relation object is included', () => {
    const result = (0, get_relation_type_1.getRelationType)({ relation: null, collection: null, field: 'test' });
    (0, vitest_1.expect)(result).toBe(null);
});
(0, vitest_1.test)('Returns a2o if relation matches and includes one_collection_field and one_allowed_collection', () => {
    const relation = {
        collection: 'pages',
        field: 'item',
        related_collection: null,
        meta: {
            one_collection_field: 'collection',
            one_allowed_collections: ['paragraphs', 'headings', 'images'],
        },
    };
    const result = (0, get_relation_type_1.getRelationType)({
        relation,
        collection: 'pages',
        field: 'item',
    });
    (0, vitest_1.expect)(result).toBe('a2o');
});
(0, vitest_1.test)('Returns m2o', () => {
    const relation = {
        collection: 'articles',
        field: 'author',
        related_collection: 'authors',
    };
    const result = (0, get_relation_type_1.getRelationType)({
        relation,
        collection: 'articles',
        field: 'author',
    });
    (0, vitest_1.expect)(result).toBe('m2o');
});
(0, vitest_1.test)('Returns o2m', () => {
    const relation = {
        collection: 'articles',
        field: 'author',
        related_collection: 'authors',
        meta: {
            one_field: 'articles',
        },
    };
    const result = (0, get_relation_type_1.getRelationType)({
        relation,
        collection: 'authors',
        field: 'articles',
    });
    (0, vitest_1.expect)(result).toBe('o2m');
});
(0, vitest_1.test)('Returns null when field/collection does not match the relationship', () => {
    const relation = {
        collection: 'articles',
        field: 'author',
        related_collection: 'authors',
        meta: {
            one_field: 'articles',
        },
    };
    const result = (0, get_relation_type_1.getRelationType)({
        relation,
        collection: 'unrelated',
        field: 'wrong',
    });
    (0, vitest_1.expect)(result).toBe(null);
});
