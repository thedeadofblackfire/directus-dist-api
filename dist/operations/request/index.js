"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const encodeurl_1 = __importDefault(require("encodeurl"));
const index_1 = require("../../request/index");
exports.default = (0, utils_1.defineOperationApi)({
    id: 'request',
    handler: async ({ url, method, body, headers }) => {
        var _a;
        const customHeaders = (_a = headers === null || headers === void 0 ? void 0 : headers.reduce((acc, { header, value }) => {
            acc[header] = value;
            return acc;
        }, {})) !== null && _a !== void 0 ? _a : {};
        if (!customHeaders['Content-Type'] && (typeof body === 'object' || (0, utils_1.isValidJSON)(body))) {
            customHeaders['Content-Type'] = 'application/json';
        }
        const axios = await (0, index_1.getAxios)();
        try {
            const result = await axios({
                url: (0, encodeurl_1.default)(url),
                method,
                data: body,
                headers: customHeaders,
            });
            return { status: result.status, statusText: result.statusText, headers: result.headers, data: result.data };
        }
        catch (error) {
            throw JSON.stringify({
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                data: error.response.data,
            });
        }
    },
});
