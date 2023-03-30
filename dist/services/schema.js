"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaService = void 0;
const database_1 = __importDefault(require("../database"));
const exceptions_1 = require("../exceptions");
const apply_diff_1 = require("../utils/apply-diff");
const get_snapshot_1 = require("../utils/get-snapshot");
const get_snapshot_diff_1 = require("../utils/get-snapshot-diff");
const get_versioned_hash_1 = require("../utils/get-versioned-hash");
const validate_diff_1 = require("../utils/validate-diff");
const validate_snapshot_1 = require("../utils/validate-snapshot");
class SchemaService {
    knex;
    accountability;
    constructor(options) {
        this.knex = options.knex ?? (0, database_1.default)();
        this.accountability = options.accountability ?? null;
    }
    async snapshot() {
        if (this.accountability?.admin !== true)
            throw new exceptions_1.ForbiddenException();
        const currentSnapshot = await (0, get_snapshot_1.getSnapshot)({ database: this.knex });
        return currentSnapshot;
    }
    async apply(payload) {
        if (this.accountability?.admin !== true)
            throw new exceptions_1.ForbiddenException();
        const currentSnapshot = await this.snapshot();
        const snapshotWithHash = this.getHashedSnapshot(currentSnapshot);
        if (!(0, validate_diff_1.validateApplyDiff)(payload, snapshotWithHash))
            return;
        await (0, apply_diff_1.applyDiff)(currentSnapshot, payload.diff, { database: this.knex });
    }
    async diff(snapshot, options) {
        if (this.accountability?.admin !== true)
            throw new exceptions_1.ForbiddenException();
        (0, validate_snapshot_1.validateSnapshot)(snapshot, options?.force);
        const currentSnapshot = options?.currentSnapshot ?? (await (0, get_snapshot_1.getSnapshot)({ database: this.knex }));
        const diff = (0, get_snapshot_diff_1.getSnapshotDiff)(currentSnapshot, snapshot);
        if (diff.collections.length === 0 && diff.fields.length === 0 && diff.relations.length === 0) {
            return null;
        }
        return diff;
    }
    getHashedSnapshot(snapshot) {
        const snapshotHash = (0, get_versioned_hash_1.getVersionedHash)(snapshot);
        return {
            ...snapshot,
            hash: snapshotHash,
        };
    }
}
exports.SchemaService = SchemaService;
