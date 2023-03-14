"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sanitize_query_1 = require("./sanitize-query");
vitest_1.vi.mock('@directus/shared/utils', async () => {
    const actual = (await vitest_1.vi.importActual('@directus/shared/utils'));
    return {
        ...actual,
        parseFilter: vitest_1.vi.fn().mockImplementation((value) => value),
    };
});
(0, vitest_1.describe)('limit', () => {
    vitest_1.test.each([-1, 0, 100])('should accept number %i', (limit) => {
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ limit });
        (0, vitest_1.expect)(sanitizedQuery.limit).toBe(limit);
    });
    (0, vitest_1.test)('should accept string 1', () => {
        const limit = '1';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ limit });
        (0, vitest_1.expect)(sanitizedQuery.limit).toBe(1);
    });
});
(0, vitest_1.describe)('fields', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const fields = ['field_a', 'field_b'];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ fields });
        (0, vitest_1.expect)(sanitizedQuery.fields).toEqual(['field_a', 'field_b']);
    });
    (0, vitest_1.test)('should split as csv when it is a string', () => {
        const fields = 'field_a,field_b';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ fields });
        (0, vitest_1.expect)(sanitizedQuery.fields).toEqual(['field_a', 'field_b']);
    });
    (0, vitest_1.test)('should split as nested csv when it is an array', () => {
        const fields = ['field_a,field_b', 'field_c'];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ fields });
        (0, vitest_1.expect)(sanitizedQuery.fields).toEqual(['field_a', 'field_b', 'field_c']);
    });
    (0, vitest_1.test)('should trim', () => {
        const fields = ['   field_a   '];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ fields });
        (0, vitest_1.expect)(sanitizedQuery.fields).toEqual(['field_a']);
    });
});
(0, vitest_1.describe)('group', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const groupBy = ['group_a', 'group_b'];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ groupBy });
        (0, vitest_1.expect)(sanitizedQuery.group).toEqual(['group_a', 'group_b']);
    });
    (0, vitest_1.test)('should split as csv when it is a string', () => {
        const groupBy = 'group_a,group_b';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ groupBy });
        (0, vitest_1.expect)(sanitizedQuery.group).toEqual(['group_a', 'group_b']);
    });
    (0, vitest_1.test)('should split as nested csv when it is an array', () => {
        const groupBy = ['group_a,group_b', 'group_c'];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ groupBy });
        (0, vitest_1.expect)(sanitizedQuery.group).toEqual(['group_a', 'group_b', 'group_c']);
    });
    (0, vitest_1.test)('should trim', () => {
        const groupBy = ['   group_a   '];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ groupBy });
        (0, vitest_1.expect)(sanitizedQuery.group).toEqual(['group_a']);
    });
});
(0, vitest_1.describe)('aggregate', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const aggregate = { count: '*' };
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ aggregate });
        (0, vitest_1.expect)(sanitizedQuery.aggregate).toEqual({ count: ['*'] });
    });
    (0, vitest_1.test)('should parse as json when it is a string', () => {
        const aggregate = '{ "count": "*" }';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ aggregate });
        (0, vitest_1.expect)(sanitizedQuery.aggregate).toEqual({ count: ['*'] });
    });
});
(0, vitest_1.describe)('sort', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const sort = ['field_a', 'field_b'];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ sort });
        (0, vitest_1.expect)(sanitizedQuery.sort).toEqual(['field_a', 'field_b']);
    });
    (0, vitest_1.test)('should split as csv when it is a string', () => {
        const sort = 'field_a,field_b';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ sort });
        (0, vitest_1.expect)(sanitizedQuery.sort).toEqual(['field_a', 'field_b']);
    });
});
(0, vitest_1.describe)('filter', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const filter = { field_a: { _eq: 'test' } };
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ filter });
        (0, vitest_1.expect)(sanitizedQuery.filter).toEqual({ field_a: { _eq: 'test' } });
    });
    (0, vitest_1.test)('should parse as json when it is a string', () => {
        const filter = '{ "field_a": { "_eq": "test" } }';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ filter });
        (0, vitest_1.expect)(sanitizedQuery.filter).toEqual({ field_a: { _eq: 'test' } });
    });
});
(0, vitest_1.describe)('offset', () => {
    (0, vitest_1.test)('should accept number 1', () => {
        const offset = 1;
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ offset });
        (0, vitest_1.expect)(sanitizedQuery.offset).toBe(1);
    });
    (0, vitest_1.test)('should accept string 1', () => {
        const offset = '1';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ offset });
        (0, vitest_1.expect)(sanitizedQuery.offset).toBe(1);
    });
    (0, vitest_1.test)('should ignore zero', () => {
        const offset = 0;
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ offset });
        (0, vitest_1.expect)(sanitizedQuery.offset).toBeUndefined();
    });
});
(0, vitest_1.describe)('page', () => {
    (0, vitest_1.test)('should accept number 1', () => {
        const page = 1;
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ page });
        (0, vitest_1.expect)(sanitizedQuery.page).toBe(1);
    });
    (0, vitest_1.test)('should accept string 1', () => {
        const page = '1';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ page });
        (0, vitest_1.expect)(sanitizedQuery.page).toBe(1);
    });
    (0, vitest_1.test)('should ignore zero', () => {
        const page = 0;
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ page });
        (0, vitest_1.expect)(sanitizedQuery.page).toBeUndefined();
    });
});
(0, vitest_1.describe)('meta', () => {
    vitest_1.test.each([
        { input: '*', expected: ['total_count', 'filter_count'] },
        { input: 'total_count', expected: ['total_count'] },
        { input: 'total_count,filter_count', expected: ['total_count', 'filter_count'] },
        { input: ['total_count', 'filter_count'], expected: ['total_count', 'filter_count'] },
    ])('should accept $input', ({ input, expected }) => {
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ meta: input });
        (0, vitest_1.expect)(sanitizedQuery.meta).toEqual(expected);
    });
});
(0, vitest_1.describe)('search', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const search = 'test';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ search });
        (0, vitest_1.expect)(sanitizedQuery.search).toBe('test');
    });
    (0, vitest_1.test)('should ignore non-string', () => {
        const search = ['test'];
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ search });
        (0, vitest_1.expect)(sanitizedQuery.search).toBeUndefined();
    });
});
(0, vitest_1.describe)('export', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const format = 'json';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ export: format });
        (0, vitest_1.expect)(sanitizedQuery.export).toBe('json');
    });
});
(0, vitest_1.describe)('deep', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const deep = { deep: { relational_field: { _sort: ['name'] } } };
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ deep });
        (0, vitest_1.expect)(sanitizedQuery.deep).toEqual({ deep: { relational_field: { _sort: ['name'] } } });
    });
    (0, vitest_1.test)('should parse as json when it is a string', () => {
        const deep = { deep: { relational_field: { _sort: ['name'] } } };
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ deep });
        (0, vitest_1.expect)(sanitizedQuery.deep).toEqual({ deep: { relational_field: { _sort: ['name'] } } });
    });
    (0, vitest_1.test)('should ignore non-underscore-prefixed queries', () => {
        const deep = { deep: { relational_field_a: { _sort: ['name'] }, relational_field_b: { sort: ['name'] } } };
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ deep });
        (0, vitest_1.expect)(sanitizedQuery.deep).toEqual({ deep: { relational_field_a: { _sort: ['name'] } } });
    });
});
(0, vitest_1.describe)('alias', () => {
    (0, vitest_1.test)('should accept valid value', () => {
        const alias = { field_a: 'testField' };
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ alias });
        (0, vitest_1.expect)(sanitizedQuery.alias).toEqual({ field_a: 'testField' });
    });
    (0, vitest_1.test)('should parse as json when it is a string', () => {
        const alias = '{ "field_a": "testField" }';
        const sanitizedQuery = (0, sanitize_query_1.sanitizeQuery)({ alias });
        (0, vitest_1.expect)(sanitizedQuery.alias).toEqual({ field_a: 'testField' });
    });
});
