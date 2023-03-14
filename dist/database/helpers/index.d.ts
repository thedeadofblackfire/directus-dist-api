import { SchemaOverview } from '@directus/shared/types';
import { Knex } from 'knex';
import * as dateHelpers from './date';
import * as fnHelpers from './fn';
import * as geometryHelpers from './geometry';
import * as schemaHelpers from './schema';
export declare function getHelpers(database: Knex): {
    date: dateHelpers.postgres | dateHelpers.oracle | dateHelpers.mysql | dateHelpers.mssql | dateHelpers.sqlite;
    st: geometryHelpers.sqlite | geometryHelpers.postgres | geometryHelpers.mysql | geometryHelpers.oracle | geometryHelpers.mssql | geometryHelpers.redshift;
    schema: schemaHelpers.sqlite | schemaHelpers.postgres | schemaHelpers.mysql | schemaHelpers.cockroachdb | schemaHelpers.oracle | schemaHelpers.mssql;
};
export declare function getFunctions(database: Knex, schema: SchemaOverview): fnHelpers.sqlite | fnHelpers.postgres | fnHelpers.mysql | fnHelpers.oracle | fnHelpers.mssql;
export type Helpers = ReturnType<typeof getHelpers>;
