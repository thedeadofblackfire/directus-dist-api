"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIP = void 0;
const node_os_1 = __importDefault(require("node:os"));
const env_1 = require("../env");
const validateIP = async (ip, url) => {
    const env = (0, env_1.getEnv)();
    if (env['IMPORT_IP_DENY_LIST'].includes(ip)) {
        throw new Error(`Requested URL "${url}" resolves to a denied IP address`);
    }
    if (env['IMPORT_IP_DENY_LIST'].includes('0.0.0.0')) {
        const networkInterfaces = node_os_1.default.networkInterfaces();
        for (const networkInfo of Object.values(networkInterfaces)) {
            if (!networkInfo)
                continue;
            for (const info of networkInfo) {
                if (info.address === ip) {
                    throw new Error(`Requested URL "${url}" resolves to a denied IP address`);
                }
            }
        }
    }
};
exports.validateIP = validateIP;
