import { GeometryHelper } from '../types';
import { Knex } from 'knex';
export declare class GeometryHelperMySQL extends GeometryHelper {
    collect(table: string, column: string): Knex.Raw;
    fromText(text: string): Knex.Raw;
    asGeoJSON(table: string, column: string): Knex.Raw;
}
