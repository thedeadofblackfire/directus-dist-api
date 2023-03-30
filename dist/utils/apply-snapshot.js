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
    const database = options?.database ?? (0, database_1.default)();
    const schema = options?.schema ?? (await (0, get_schema_1.getSchema)({ database, bypassCache: true }));
    const { systemCache } = (0, cache_1.getCache)();
    const current = options?.current ?? (await (0, get_snapshot_1.getSnapshot)({ database, schema }));
    const snapshotDiff = options?.diff ?? (0, get_snapshot_diff_1.getSnapshotDiff)(current, snapshot);
    await (0, apply_diff_1.applyDiff)(current, snapshotDiff, { database, schema });
    await systemCache?.clear();
}
exports.applySnapshot = applySnapshot;
