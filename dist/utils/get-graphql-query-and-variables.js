"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGraphqlQueryAndVariables = void 0;
const lodash_1 = require("lodash");
function getGraphqlQueryAndVariables(req) {
    const isGet = req.method?.toLowerCase() === 'get';
    return (0, lodash_1.pick)(isGet ? req.query : req.body, ['query', 'variables']);
}
exports.getGraphqlQueryAndVariables = getGraphqlQueryAndVariables;
