import { OperationRaw } from '@directus/shared/types';
import { AbstractServiceOptions, Item, MutationOptions, PrimaryKey } from '../types';
import { ItemsService } from './items';
export declare class OperationsService extends ItemsService<OperationRaw> {
    constructor(options: AbstractServiceOptions);
    createOne(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey>;
    createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    updateBatch(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    updateMany(keys: PrimaryKey[], data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey[]>;
    deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]>;
}
