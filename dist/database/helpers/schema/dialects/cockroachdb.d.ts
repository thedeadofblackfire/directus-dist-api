import type { KNEX_TYPES } from '@directus/shared/constants';
import { Options, SchemaHelper } from '../types';
export declare class SchemaHelperCockroachDb extends SchemaHelper {
    changeToType(table: string, column: string, type: (typeof KNEX_TYPES)[number], options?: Options): Promise<void>;
    constraintName(existingName: string): string;
}
