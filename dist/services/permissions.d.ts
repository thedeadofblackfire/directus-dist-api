import { ItemsService, QueryOptions } from '../services/items';
import { AbstractServiceOptions, Item, PrimaryKey, MutationOptions } from '../types';
import { Query, PermissionsAction } from '@directus/shared/types';
import Keyv from 'keyv';
export declare class PermissionsService extends ItemsService {
    systemCache: Keyv<any>;
    constructor(options: AbstractServiceOptions);
    getAllowedFields(action: PermissionsAction, collection?: string): Record<string, string[]>;
    readByQuery(query: Query, opts?: QueryOptions): Promise<Partial<Item>[]>;
    readMany(keys: PrimaryKey[], query?: Query, opts?: QueryOptions): Promise<Partial<Item>[]>;
    createOne(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>;
    createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    updateBatch(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    updateMany(keys: PrimaryKey[], data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey[]>;
    upsertMany(payloads: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]>;
}
