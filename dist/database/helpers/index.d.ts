import type { SchemaOverview } from '@directus/shared/types';
import type { Knex } from 'knex';
import * as dateHelpers from './date';
import * as fnHelpers from './fn';
import * as geometryHelpers from './geometry';
import * as schemaHelpers from './schema';
export declare function getHelpers(database: Knex): {
    date: dateHelpers.postgres | dateHelpers.oracle | dateHelpers.mysql | dateHelpers.mssql | dateHelpers.sqlite;
    st: geometryHelpers.mysql | geometryHelpers.postgres | geometryHelpers.mssql | geometryHelpers.sqlite | geometryHelpers.oracle | geometryHelpers.redshift;
    schema: schemaHelpers.mysql | schemaHelpers.cockroachdb | schemaHelpers.mssql | schemaHelpers.postgres | schemaHelpers.sqlite | schemaHelpers.oracle;
};
export declare function getFunctions(database: Knex, schema: SchemaOverview): fnHelpers.mysql | fnHelpers.postgres | fnHelpers.mssql | fnHelpers.sqlite | fnHelpers.oracle;
export type Helpers = ReturnType<typeof getHelpers>;
