"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const graphql_1 = require("../middleware/graphql");
const respond_1 = require("../middleware/respond");
const services_1 = require("../services");
const async_handler_1 = __importDefault(require("../utils/async-handler"));
const router = (0, express_1.Router)();
router.use('/system', graphql_1.parseGraphQL, (0, async_handler_1.default)(async (req, res, next) => {
    var _a, _b;
    const service = new services_1.GraphQLService({
        accountability: req.accountability,
        schema: req.schema,
        scope: 'system',
    });
    res.locals.payload = await service.execute(res.locals.graphqlParams);
    if (((_b = (_a = res.locals.payload) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b.length) > 0) {
        res.locals.cache = false;
    }
    return next();
}), respond_1.respond);
router.use('/', graphql_1.parseGraphQL, (0, async_handler_1.default)(async (req, res, next) => {
    var _a, _b;
    const service = new services_1.GraphQLService({
        accountability: req.accountability,
        schema: req.schema,
        scope: 'items',
    });
    res.locals.payload = await service.execute(res.locals.graphqlParams);
    if (((_b = (_a = res.locals.payload) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b.length) > 0) {
        res.locals.cache = false;
    }
    return next();
}), respond_1.respond);
exports.default = router;
