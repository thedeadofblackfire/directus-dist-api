import type { Notification } from '@directus/shared/types';
import type { AbstractServiceOptions, MutationOptions, PrimaryKey } from '../types';
import { ItemsService } from './items';
import { MailService } from './mail';
import { UsersService } from './users';
export declare class NotificationsService extends ItemsService {
    usersService: UsersService;
    mailService: MailService;
    constructor(options: AbstractServiceOptions);
    createOne(data: Partial<Notification>, opts?: MutationOptions): Promise<PrimaryKey>;
    createMany(data: Partial<Notification>[], opts?: MutationOptions): Promise<PrimaryKey[]>;
    sendEmail(data: Partial<Notification>): Promise<void>;
}
