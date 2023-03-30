"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessenger = exports.MessengerRedis = exports.MessengerMemory = void 0;
const utils_1 = require("@directus/shared/utils");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = __importDefault(require("./env"));
const get_config_from_env_1 = require("./utils/get-config-from-env");
class MessengerMemory {
    handlers;
    constructor() {
        this.handlers = {};
    }
    publish(channel, payload) {
        this.handlers[channel]?.(payload);
    }
    subscribe(channel, callback) {
        this.handlers[channel] = callback;
    }
    unsubscribe(channel) {
        delete this.handlers[channel];
    }
}
exports.MessengerMemory = MessengerMemory;
class MessengerRedis {
    namespace;
    pub;
    sub;
    constructor() {
        const config = (0, get_config_from_env_1.getConfigFromEnv)('MESSENGER_REDIS');
        this.pub = new ioredis_1.default(env_1.default['MESSENGER_REDIS'] ?? config);
        this.sub = new ioredis_1.default(env_1.default['MESSENGER_REDIS'] ?? config);
        this.namespace = env_1.default['MESSENGER_NAMESPACE'] ?? 'directus';
    }
    publish(channel, payload) {
        this.pub.publish(`${this.namespace}:${channel}`, JSON.stringify(payload));
    }
    subscribe(channel, callback) {
        this.sub.subscribe(`${this.namespace}:${channel}`);
        this.sub.on('message', (messageChannel, payloadString) => {
            const payload = (0, utils_1.parseJSON)(payloadString);
            if (messageChannel === `${this.namespace}:${channel}`) {
                callback(payload);
            }
        });
    }
    unsubscribe(channel) {
        this.sub.unsubscribe(`${this.namespace}:${channel}`);
    }
}
exports.MessengerRedis = MessengerRedis;
let messenger;
function getMessenger() {
    if (messenger)
        return messenger;
    if (env_1.default['MESSENGER_STORE'] === 'redis') {
        messenger = new MessengerRedis();
    }
    else {
        messenger = new MessengerMemory();
    }
    return messenger;
}
exports.getMessenger = getMessenger;
