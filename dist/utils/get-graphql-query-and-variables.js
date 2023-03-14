"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGraphqlQueryAndVariables = void 0;
const lodash_1 = require("lodash");
function getGraphqlQueryAndVariables(req) {
    var _a;
    const isGet = ((_a = req.method) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'get';
    return (0, lodash_1.pick)(isGet ? req.query : req.body, ['query', 'variables']);
}
exports.getGraphqlQueryAndVariables = getGraphqlQueryAndVariables;
