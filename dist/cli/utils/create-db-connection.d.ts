import { Knex } from 'knex';
import type { Driver } from '../../types';
export type Credentials = {
    filename?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    options__encrypt?: boolean;
};
export default function createDBConnection(client: Driver, credentials: Credentials): Knex<any, unknown[]>;
