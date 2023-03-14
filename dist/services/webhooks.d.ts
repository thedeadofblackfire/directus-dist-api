import { AbstractServiceOptions, Item, PrimaryKey, Webhook, MutationOptions } from '../types';
import { ItemsService } from './items';
import { Messenger } from '../messenger';
export declare class WebhooksService extends ItemsService<Webhook> {
    messenger: Messenger;
    constructor(options: AbstractServiceOptions);
    createOne(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>;
    createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    updateMany(keys: PrimaryKey[], data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey[]>;
    deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]>;
}
