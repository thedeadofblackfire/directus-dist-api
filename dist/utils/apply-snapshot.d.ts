import type { SchemaOverview } from '@directus/shared/types';
import type { Knex } from 'knex';
import type { Snapshot, SnapshotDiff } from '../types';
export declare function applySnapshot(snapshot: Snapshot, options?: {
    database?: Knex;
    schema?: SchemaOverview;
    current?: Snapshot;
    diff?: SnapshotDiff;
}): Promise<void>;
