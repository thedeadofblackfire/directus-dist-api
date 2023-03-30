import type { Field, RawField } from '@directus/shared/types';
import type { Knex } from 'knex';
import type { GeoJSONGeometry } from 'wellknown';
import { GeometryHelper } from '../types';
export declare class GeometryHelperOracle extends GeometryHelper {
    isTrue(expression: Knex.Raw): Knex.Raw<any>;
    isFalse(expression: Knex.Raw): Knex.Raw<any>;
    createColumn(table: Knex.CreateTableBuilder, field: RawField | Field): Knex.ColumnBuilder;
    asText(table: string, column: string): Knex.Raw;
    asGeoJSON(table: string, column: string): Knex.Raw;
    fromText(text: string): Knex.Raw;
    _intersects(key: string, geojson: GeoJSONGeometry): Knex.Raw;
    _intersects_bbox(key: string, geojson: GeoJSONGeometry): Knex.Raw;
    collect(table: string, column: string): Knex.Raw;
}
