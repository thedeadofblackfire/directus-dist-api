"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_relation_info_1 = require("../../src/utils/get-relation-info");
const vitest_1 = require("vitest");
(0, vitest_1.describe)('getRelationInfo', () => {
    (0, vitest_1.it)('Errors on suspiciously long implicit $FOLLOW', () => {
        (0, vitest_1.expect)(() => (0, get_relation_info_1.getRelationInfo)([], 'related_test_collection', '$FOLLOW(test_collection, test_field, aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)')).toThrowError(Error);
    });
    (0, vitest_1.it)('Generates a new relation object for an implicit o2m relation', () => {
        const result = (0, get_relation_info_1.getRelationInfo)([], 'related_test_collection', '$FOLLOW(test_collection, test_field)');
        (0, vitest_1.expect)(result).toEqual({
            relation: {
                collection: 'test_collection',
                field: 'test_field',
                related_collection: 'related_test_collection',
                schema: null,
                meta: null,
            },
            relationType: 'o2m',
        });
    });
    (0, vitest_1.it)('Generates a new relation object for an implicit o2a relation', () => {
        const result = (0, get_relation_info_1.getRelationInfo)([], 'related_test_collection', '$FOLLOW(test_collection, test_field, test_collection_field)');
        (0, vitest_1.expect)(result).toEqual({
            relation: {
                collection: 'test_collection',
                field: 'test_field',
                related_collection: 'related_test_collection',
                schema: null,
                meta: {
                    one_collection_field: 'test_collection_field',
                },
            },
            relationType: 'o2a',
        });
    });
    (0, vitest_1.it)('Returns the correct existing relation for the given collection/field', () => {
        const testRelations = [
            // o2m
            {
                collection: 'articles',
                field: 'author_id',
                related_collection: 'authors',
                meta: {
                    one_field: 'articles',
                },
                schema: null,
            },
            // m2o
            {
                collection: 'articles',
                field: 'category_id',
                related_collection: 'categories',
                meta: null,
                schema: null,
            },
            // a2o
            {
                collection: 'pages',
                field: 'item',
                related_collection: null,
                meta: {
                    one_collection_field: 'collection',
                    one_allowed_collections: ['headings', 'paragraphs', 'images'],
                },
            },
        ];
        const o2mResult = (0, get_relation_info_1.getRelationInfo)(testRelations, 'authors', 'articles');
        (0, vitest_1.expect)(o2mResult).toEqual({
            relationType: 'o2m',
            relation: testRelations[0],
        });
        const m2oResult = (0, get_relation_info_1.getRelationInfo)(testRelations, 'articles', 'category_id');
        (0, vitest_1.expect)(m2oResult).toEqual({
            relationType: 'm2o',
            relation: testRelations[1],
        });
        const a2oResult = (0, get_relation_info_1.getRelationInfo)(testRelations, 'pages', 'item');
        (0, vitest_1.expect)(a2oResult).toEqual({
            relationType: 'a2o',
            relation: testRelations[2],
        });
        const noResult = (0, get_relation_info_1.getRelationInfo)(testRelations, 'does not exist', 'wrong field');
        (0, vitest_1.expect)(noResult).toEqual({
            relation: null,
            relationType: null,
        });
    });
});
