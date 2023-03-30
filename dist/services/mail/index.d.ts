import type { Accountability, SchemaOverview } from '@directus/shared/types';
import type { Knex } from 'knex';
import type { SendMailOptions, Transporter } from 'nodemailer';
import type { AbstractServiceOptions } from '../../types';
export type EmailOptions = SendMailOptions & {
    template?: {
        name: string;
        data: Record<string, any>;
    };
};
export declare class MailService {
    schema: SchemaOverview;
    accountability: Accountability | null;
    knex: Knex;
    mailer: Transporter;
    constructor(opts: AbstractServiceOptions);
    send<T>(options: EmailOptions): Promise<T>;
    private renderTemplate;
    private getDefaultTemplateData;
}
