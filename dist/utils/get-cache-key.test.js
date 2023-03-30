"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const get_cache_key_1 = require("./get-cache-key");
const getGraphqlQueryUtil = __importStar(require("./get-graphql-query-and-variables"));
const baseUrl = 'http://localhost';
const restUrl = `${baseUrl}/items/example`;
const graphQlUrl = `${baseUrl}/graphql`;
const accountability = { user: '00000000-0000-0000-0000-000000000000' };
const method = 'GET';
const requests = [
    {
        name: 'as unauthenticated request',
        params: { method, originalUrl: restUrl },
        key: '17da8272c9a0ec6eea38a37d6d78bddeb7c79045',
    },
    {
        name: 'as authenticated request',
        params: { method, originalUrl: restUrl, accountability },
        key: '99a6394222a3d7d149ac1662fc2fff506932db58',
    },
    {
        name: 'a request with a fields query',
        params: { method, originalUrl: restUrl, sanitizedQuery: { fields: ['id', 'name'] } },
        key: 'aa6e2d8a78de4dfb4af6eaa230d1cd9b7d31ed19',
    },
    {
        name: 'a request with a filter query',
        params: { method, originalUrl: restUrl, sanitizedQuery: { filter: { name: { _eq: 'test' } } } },
        key: 'd7eb8970f0429e1cf85e12eb5bb8669f618b09d3',
    },
    {
        name: 'a GraphQL GET query request',
        params: { method, originalUrl: graphQlUrl, query: { query: 'query { test { id } }' } },
        key: '201731b75c627c60554512d819b6935b54c73814',
    },
    {
        name: 'a GraphQL POST query request',
        params: { method: 'POST', originalUrl: graphQlUrl, body: { query: 'query { test { name } }' } },
        key: '64eb0c48ea69d0863ff930398f29b5c7884f88f7',
    },
    {
        name: 'an authenticated GraphQL GET query request',
        params: { method, originalUrl: graphQlUrl, accountability, query: { query: 'query { test { id } }' } },
        key: '9bc52c98dcf2de04c64589f52e0ada1e38d53a90',
    },
    {
        name: 'an authenticated GraphQL POST query request',
        params: { method: 'POST', originalUrl: graphQlUrl, accountability, body: { query: 'query { test { name } }' } },
        key: '051ea77ce5ba71bbc88bcb567b9ddc602b585c13',
    },
];
const cases = requests.map(({ name, params, key }) => [name, params, key]);
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.describe)('get cache key', () => {
    (0, vitest_1.describe)('isGraphQl', () => {
        let getGraphqlQuerySpy;
        (0, vitest_1.beforeAll)(() => {
            getGraphqlQuerySpy = vitest_1.vi.spyOn(getGraphqlQueryUtil, 'getGraphqlQueryAndVariables');
        });
        vitest_1.test.each(['/items/test', '/items/graphql', '/collections/test', '/collections/graphql'])('path "%s" should not be interpreted as a graphql query', (path) => {
            (0, get_cache_key_1.getCacheKey)({ originalUrl: `${baseUrl}${path}` });
            (0, vitest_1.expect)(getGraphqlQuerySpy).not.toHaveBeenCalled();
        });
        vitest_1.test.each(['/graphql', '/graphql/system'])('path "%s" should be interpreted as a graphql query', (path) => {
            (0, get_cache_key_1.getCacheKey)({ originalUrl: `${baseUrl}${path}` });
            (0, vitest_1.expect)(getGraphqlQuerySpy).toHaveBeenCalledOnce();
        });
    });
    vitest_1.test.each(cases)('should create a cache key for %s', (_, params, key) => {
        (0, vitest_1.expect)((0, get_cache_key_1.getCacheKey)(params)).toEqual(key);
    });
    (0, vitest_1.test)('should create a unique key for each request', () => {
        const keys = cases.map(([, params]) => (0, get_cache_key_1.getCacheKey)(params));
        const hasDuplicate = keys.some((key) => keys.indexOf(key) !== keys.lastIndexOf(key));
        (0, vitest_1.expect)(hasDuplicate).toBeFalsy();
    });
    (0, vitest_1.test)('should create a unique key for GraphQL requests with different variables', () => {
        const query = 'query Test ($name: String) { test (filter: { name: { _eq: $name } }) { id } }';
        const operationName = 'test';
        const variables1 = JSON.stringify({ name: 'test 1' });
        const variables2 = JSON.stringify({ name: 'test 2' });
        const req1 = { method, originalUrl: graphQlUrl, query: { query, operationName, variables: variables1 } };
        const req2 = { method, originalUrl: graphQlUrl, query: { query, operationName, variables: variables2 } };
        const postReq1 = { method: 'POST', originalUrl: req1.originalUrl, body: req1.query };
        const postReq2 = { method: 'POST', originalUrl: req2.originalUrl, body: req2.query };
        (0, vitest_1.expect)((0, get_cache_key_1.getCacheKey)(req1)).not.toEqual((0, get_cache_key_1.getCacheKey)(req2));
        (0, vitest_1.expect)((0, get_cache_key_1.getCacheKey)(postReq1)).not.toEqual((0, get_cache_key_1.getCacheKey)(postReq2));
        (0, vitest_1.expect)((0, get_cache_key_1.getCacheKey)(req1)).toEqual((0, get_cache_key_1.getCacheKey)(postReq1));
        (0, vitest_1.expect)((0, get_cache_key_1.getCacheKey)(req2)).toEqual((0, get_cache_key_1.getCacheKey)(postReq2));
    });
});
