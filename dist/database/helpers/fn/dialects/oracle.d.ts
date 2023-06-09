import type { Knex } from 'knex';
import { FnHelper, FnHelperOptions } from '../types.js';
export declare class FnHelperOracle extends FnHelper {
    year(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    month(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    week(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    day(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    weekday(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    hour(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    minute(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    second(table: string, column: string, options: FnHelperOptions): Knex.Raw;
    count(table: string, column: string, options?: FnHelperOptions): Knex.Raw<any>;
}
