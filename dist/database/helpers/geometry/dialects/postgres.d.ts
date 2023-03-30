import type { Field, RawField } from '@directus/shared/types';
import type { Knex } from 'knex';
import type { GeoJSONGeometry } from 'wellknown';
import { GeometryHelper } from '../types';
export declare class GeometryHelperPostgres extends GeometryHelper {
    supported(): Promise<boolean>;
    createColumn(table: Knex.CreateTableBuilder, field: RawField | Field): Knex.ColumnBuilder;
    _intersects_bbox(key: string, geojson: GeoJSONGeometry): Knex.Raw;
    asGeoJSON(table: string, column: string): Knex.Raw;
}
