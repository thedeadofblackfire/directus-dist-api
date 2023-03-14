"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseInterceptor = void 0;
const validate_ip_1 = require("./validate-ip");
const responseInterceptor = async (config) => {
    await (0, validate_ip_1.validateIP)(config.request.socket.remoteAddress, config.request.url);
    return config;
};
exports.responseInterceptor = responseInterceptor;
