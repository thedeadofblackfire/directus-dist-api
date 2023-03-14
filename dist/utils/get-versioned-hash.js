"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionedHash = void 0;
const object_hash_1 = __importDefault(require("object-hash"));
const package_json_1 = require("../../package.json");
function getVersionedHash(item) {
    return (0, object_hash_1.default)({ item, version: package_json_1.version });
}
exports.getVersionedHash = getVersionedHash;
