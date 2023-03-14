"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAxios = exports._cache = void 0;
const request_interceptor_1 = require("./request-interceptor");
const response_interceptor_1 = require("./response-interceptor");
exports._cache = {
    axiosInstance: null,
};
async function getAxios() {
    if (!exports._cache.axiosInstance) {
        const axios = (await import('axios')).default;
        exports._cache.axiosInstance = axios.create();
        exports._cache.axiosInstance.interceptors.request.use(request_interceptor_1.requestInterceptor);
        exports._cache.axiosInstance.interceptors.response.use(response_interceptor_1.responseInterceptor);
    }
    return exports._cache.axiosInstance;
}
exports.getAxios = getAxios;
