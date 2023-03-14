import { SchemaOverview } from '@directus/shared/types';
import { Knex } from 'knex';
import { Snapshot, SnapshotDiff, SnapshotField } from '../types';
import { Diff } from 'deep-diff';
export declare function applyDiff(currentSnapshot: Snapshot, snapshotDiff: SnapshotDiff, options?: {
    database?: Knex;
    schema?: SchemaOverview;
}): Promise<void>;
export declare function isNestedMetaUpdate(diff: Diff<SnapshotField | undefined>): boolean;
