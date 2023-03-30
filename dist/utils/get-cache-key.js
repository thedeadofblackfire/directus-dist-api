"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheKey = void 0;
const object_hash_1 = __importDefault(require("object-hash"));
const url_1 = __importDefault(require("url"));
const get_graphql_query_and_variables_1 = require("./get-graphql-query-and-variables");
function getCacheKey(req) {
    const path = url_1.default.parse(req.originalUrl).pathname;
    const isGraphQl = path?.startsWith('/graphql');
    const info = {
        user: req.accountability?.user || null,
        path,
        query: isGraphQl ? (0, get_graphql_query_and_variables_1.getGraphqlQueryAndVariables)(req) : req.sanitizedQuery,
    };
    const key = (0, object_hash_1.default)(info);
    return key;
}
exports.getCacheKey = getCacheKey;
