"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const calculate_field_depth_1 = require("../../src/utils/calculate-field-depth");
const vitest_1 = require("vitest");
(0, vitest_1.test)('Calculates basic depth', () => {
    const filter = {
        name: {
            _eq: 'test',
        },
    };
    const result = (0, calculate_field_depth_1.calculateFieldDepth)(filter);
    (0, vitest_1.expect)(result).toBe(1);
});
(0, vitest_1.test)('Calculates relational depth', () => {
    const filter = {
        author: {
            name: {
                _eq: 'test',
            },
        },
    };
    const result = (0, calculate_field_depth_1.calculateFieldDepth)(filter);
    (0, vitest_1.expect)(result).toBe(2);
});
(0, vitest_1.test)('Ignores _and/_or', () => {
    const filter = {
        _and: [
            {
                _or: [
                    {
                        author: {
                            name: {
                                _eq: 'Directus',
                            },
                        },
                    },
                    {
                        status: {
                            _eq: 'published',
                        },
                    },
                ],
            },
            {
                category: {
                    _eq: 'recipes',
                },
            },
        ],
    };
    const result = (0, calculate_field_depth_1.calculateFieldDepth)(filter);
    (0, vitest_1.expect)(result).toBe(2);
});
(0, vitest_1.test)('Skips underscore prefix in tree', () => {
    const deep = {
        translations: {
            _filter: {
                language_id: {
                    code: {
                        _eq: 'nl-NL',
                    },
                },
            },
        },
    };
    const result = (0, calculate_field_depth_1.calculateFieldDepth)(deep);
    (0, vitest_1.expect)(result).toBe(3);
});
(0, vitest_1.test)('Calculates _sort in deep correctly', () => {
    const deep = {
        articles: {
            _sort: ['sort', 'category.type.sort'],
        },
    };
    const result = (0, calculate_field_depth_1.calculateFieldDepth)(deep, ['_sort']);
    (0, vitest_1.expect)(result).toBe(4);
});
