import type { Field, RawField } from '@directus/shared/types';
import type { Knex } from 'knex';
import { GeometryHelper } from '../types';
export declare class GeometryHelperRedshift extends GeometryHelper {
    createColumn(table: Knex.CreateTableBuilder, field: RawField | Field): Knex.ColumnBuilder;
    asGeoJSON(table: string, column: string): Knex.Raw;
}
