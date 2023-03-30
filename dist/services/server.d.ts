import type { Knex } from 'knex';
import type { Accountability, SchemaOverview } from '@directus/shared/types';
import type { AbstractServiceOptions } from '../types';
import { SettingsService } from './settings';
export declare class ServerService {
    knex: Knex;
    accountability: Accountability | null;
    settingsService: SettingsService;
    schema: SchemaOverview;
    constructor(options: AbstractServiceOptions);
    serverInfo(): Promise<Record<string, any>>;
    health(): Promise<Record<string, any>>;
}
