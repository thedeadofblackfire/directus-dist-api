import type { Knex } from 'knex';
import { GeometryHelper } from '../types';
export declare class GeometryHelperSQLite extends GeometryHelper {
    supported(): Promise<boolean>;
    asGeoJSON(table: string, column: string): Knex.Raw;
}
