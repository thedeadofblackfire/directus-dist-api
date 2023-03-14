"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySnapshot = void 0;
const cache_1 = require("../cache");
const database_1 = __importDefault(require("../database"));
const apply_diff_1 = require("./apply-diff");
const get_schema_1 = require("./get-schema");
const get_snapshot_1 = require("./get-snapshot");
const get_snapshot_diff_1 = require("./get-snapshot-diff");
async function applySnapshot(snapshot, options) {
    var _a, _b, _c, _d;
    const database = (_a = options === null || options === void 0 ? void 0 : options.database) !== null && _a !== void 0 ? _a : (0, database_1.default)();
    const schema = (_b = options === null || options === void 0 ? void 0 : options.schema) !== null && _b !== void 0 ? _b : (await (0, get_schema_1.getSchema)({ database, bypassCache: true }));
    const { systemCache } = (0, cache_1.getCache)();
    const current = (_c = options === null || options === void 0 ? void 0 : options.current) !== null && _c !== void 0 ? _c : (await (0, get_snapshot_1.getSnapshot)({ database, schema }));
    const snapshotDiff = (_d = options === null || options === void 0 ? void 0 : options.diff) !== null && _d !== void 0 ? _d : (0, get_snapshot_diff_1.getSnapshotDiff)(current, snapshot);
    await (0, apply_diff_1.applyDiff)(current, snapshotDiff, { database, schema });
    await (systemCache === null || systemCache === void 0 ? void 0 : systemCache.clear());
}
exports.applySnapshot = applySnapshot;
