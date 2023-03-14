/// <reference types="node" />
import type { Range, Stat } from '@directus/storage';
import { Accountability } from '@directus/shared/types';
import { Knex } from 'knex';
import type { Readable } from 'node:stream';
import { AbstractServiceOptions, TransformationParams, TransformationPreset } from '../types';
import { AuthorizationService } from './authorization';
export declare class AssetsService {
    knex: Knex;
    accountability: Accountability | null;
    authorizationService: AuthorizationService;
    constructor(options: AbstractServiceOptions);
    getAsset(id: string, transformation: TransformationParams | TransformationPreset, range?: Range): Promise<{
        stream: Readable;
        file: any;
        stat: Stat;
    }>;
}
