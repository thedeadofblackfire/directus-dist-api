"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const get_graphql_query_and_variables_1 = require("./get-graphql-query-and-variables");
const query = `
	query getProduct($id: ID!) {
		products_by_id(id: $id) {
			id
		}
	}
`;
const variables = JSON.stringify({ id: 1 });
const additionalProperty = 'test';
(0, vitest_1.test)('should get query from request query for GET method', async () => {
    const request = { method: 'GET', query: { query, variables, additionalProperty } };
    (0, vitest_1.expect)((0, get_graphql_query_and_variables_1.getGraphqlQueryAndVariables)(request)).toEqual({ query, variables });
});
(0, vitest_1.test)('should get query from request body for other methods', async () => {
    const request = { method: 'POST', body: { query, variables, additionalProperty } };
    (0, vitest_1.expect)((0, get_graphql_query_and_variables_1.getGraphqlQueryAndVariables)(request)).toEqual({ query, variables });
});
