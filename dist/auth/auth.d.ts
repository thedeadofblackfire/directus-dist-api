import type { SchemaOverview } from '@directus/shared/types';
import type { Knex } from 'knex';
import type { AuthDriverOptions, User } from '../types';
export declare abstract class AuthDriver {
    knex: Knex;
    schema: SchemaOverview;
    constructor(options: AuthDriverOptions, _config: Record<string, any>);
    /**
     * Get user id for a given provider payload
     *
     * @param payload Any data that the user might've provided
     * @throws InvalidCredentialsException
     * @return User id of the identifier
     */
    abstract getUserID(payload: Record<string, any>): Promise<string>;
    /**
     * Verify user password
     *
     * @param user User information
     * @param password User password
     * @throws InvalidCredentialsException
     */
    abstract verify(user: User, password?: string): Promise<void>;
    /**
     * Check with the (external) provider if the user is allowed entry to Directus
     *
     * @param _user User information
     * @param _payload Any data that the user might've provided
     * @throws InvalidCredentialsException
     * @returns Data to be stored with the session
     */
    login(_user: User, _payload: Record<string, any>): Promise<void>;
    /**
     * Handle user session refresh
     *
     * @param _user User information
     * @throws InvalidCredentialsException
     */
    refresh(_user: User): Promise<void>;
    /**
     * Handle user session termination
     *
     * @param _user User information
     */
    logout(_user: User): Promise<void>;
}
