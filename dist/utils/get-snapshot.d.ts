import type { SchemaOverview } from '@directus/shared/types';
import type { Knex } from 'knex';
import type { Snapshot } from '../types';
export declare function getSnapshot(options?: {
    database?: Knex;
    schema?: SchemaOverview;
}): Promise<Snapshot>;
