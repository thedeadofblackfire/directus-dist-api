import type { PostgresError } from './types';
export declare function extractError(error: PostgresError): PostgresError | Error;
