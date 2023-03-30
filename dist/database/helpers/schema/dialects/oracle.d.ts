import type { KNEX_TYPES } from '@directus/shared/constants';
import type { Field, Relation, Type } from '@directus/shared/types';
import { Options, SchemaHelper } from '../types';
export declare class SchemaHelperOracle extends SchemaHelper {
    changeToType(table: string, column: string, type: (typeof KNEX_TYPES)[number], options?: Options): Promise<void>;
    castA2oPrimaryKey(): string;
    preRelationChange(relation: Partial<Relation>): void;
    processFieldType(field: Field): Type;
}
