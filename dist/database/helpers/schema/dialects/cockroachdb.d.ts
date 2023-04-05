import type { KNEX_TYPES } from '@directus/constants';
import { Options, SchemaHelper } from '../types.js';
export declare class SchemaHelperCockroachDb extends SchemaHelper {
    changeToType(table: string, column: string, type: (typeof KNEX_TYPES)[number], options?: Options): Promise<void>;
    constraintName(existingName: string): string;
}
