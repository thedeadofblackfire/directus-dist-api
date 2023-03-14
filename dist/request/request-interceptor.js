"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestInterceptor = void 0;
const axios_1 = __importDefault(require("axios"));
const promises_1 = require("node:dns/promises");
const node_net_1 = require("node:net");
const node_url_1 = require("node:url");
const logger_1 = __importDefault(require("../logger"));
const validate_ip_1 = require("./validate-ip");
const requestInterceptor = async (config) => {
    const uri = axios_1.default.getUri(config);
    const { hostname } = new node_url_1.URL(uri);
    let ip;
    if ((0, node_net_1.isIP)(hostname) === 0) {
        try {
            const dns = await (0, promises_1.lookup)(hostname);
            ip = dns.address;
        }
        catch (err) {
            logger_1.default.warn(err, `Couldn't lookup the DNS for url "${uri}"`);
            throw new Error(`Requested URL "${uri}" resolves to a denied IP address`);
        }
    }
    else {
        ip = hostname;
    }
    await (0, validate_ip_1.validateIP)(ip, uri);
    return config;
};
exports.requestInterceptor = requestInterceptor;
