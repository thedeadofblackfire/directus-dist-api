import { Messenger } from '../messenger';
import type { AbstractServiceOptions, Item, MutationOptions, PrimaryKey, Webhook } from '../types';
import { ItemsService } from './items';
export declare class WebhooksService extends ItemsService<Webhook> {
    messenger: Messenger;
    constructor(options: AbstractServiceOptions);
    createOne(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>;
    createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    updateMany(keys: PrimaryKey[], data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey[]>;
    deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]>;
}
