import { SchemaOverview } from '@directus/shared/types';
import { Knex } from 'knex';
import { Snapshot, SnapshotDiff } from '../types';
export declare function applySnapshot(snapshot: Snapshot, options?: {
    database?: Knex;
    schema?: SchemaOverview;
    current?: Snapshot;
    diff?: SnapshotDiff;
}): Promise<void>;
