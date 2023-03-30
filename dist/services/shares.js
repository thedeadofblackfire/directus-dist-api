"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharesService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../env"));
const exceptions_1 = require("../exceptions");
const get_milliseconds_1 = require("../utils/get-milliseconds");
const md_1 = require("../utils/md");
const url_1 = require("../utils/url");
const user_name_1 = require("../utils/user-name");
const authorization_1 = require("./authorization");
const items_1 = require("./items");
const mail_1 = require("./mail");
const users_1 = require("./users");
class SharesService extends items_1.ItemsService {
    authorizationService;
    constructor(options) {
        super('directus_shares', options);
        this.authorizationService = new authorization_1.AuthorizationService({
            accountability: this.accountability,
            knex: this.knex,
            schema: this.schema,
        });
    }
    async createOne(data, opts) {
        await this.authorizationService.checkAccess('share', data['collection'], data['item']);
        return super.createOne(data, opts);
    }
    async login(payload) {
        const { nanoid } = await import('nanoid');
        const record = await this.knex
            .select({
            share_id: 'id',
            share_role: 'role',
            share_item: 'item',
            share_collection: 'collection',
            share_start: 'date_start',
            share_end: 'date_end',
            share_times_used: 'times_used',
            share_max_uses: 'max_uses',
            share_password: 'password',
        })
            .from('directus_shares')
            .where('id', payload['share'])
            .andWhere((subQuery) => {
            subQuery.whereNull('date_end').orWhere('date_end', '>=', new Date());
        })
            .andWhere((subQuery) => {
            subQuery.whereNull('date_start').orWhere('date_start', '<=', new Date());
        })
            .andWhere((subQuery) => {
            subQuery.whereNull('max_uses').orWhere('max_uses', '>=', this.knex.ref('times_used'));
        })
            .first();
        if (!record) {
            throw new exceptions_1.InvalidCredentialsException();
        }
        if (record.share_password && !(await argon2_1.default.verify(record.share_password, payload['password']))) {
            throw new exceptions_1.InvalidCredentialsException();
        }
        await this.knex('directus_shares')
            .update({ times_used: record.share_times_used + 1 })
            .where('id', record.share_id);
        const tokenPayload = {
            app_access: false,
            admin_access: false,
            role: record.share_role,
            share: record.share_id,
            share_scope: {
                item: record.share_item,
                collection: record.share_collection,
            },
        };
        const accessToken = jsonwebtoken_1.default.sign(tokenPayload, env_1.default['SECRET'], {
            expiresIn: env_1.default['ACCESS_TOKEN_TTL'],
            issuer: 'directus',
        });
        const refreshToken = nanoid(64);
        const refreshTokenExpiration = new Date(Date.now() + (0, get_milliseconds_1.getMilliseconds)(env_1.default['REFRESH_TOKEN_TTL'], 0));
        await this.knex('directus_sessions').insert({
            token: refreshToken,
            expires: refreshTokenExpiration,
            ip: this.accountability?.ip,
            user_agent: this.accountability?.userAgent,
            origin: this.accountability?.origin,
            share: record.share_id,
        });
        await this.knex('directus_sessions').delete().where('expires', '<', new Date());
        return {
            accessToken,
            refreshToken,
            expires: (0, get_milliseconds_1.getMilliseconds)(env_1.default['ACCESS_TOKEN_TTL']),
        };
    }
    /**
     * Send a link to the given share ID to the given email(s). Note: you can only send a link to a share
     * if you have read access to that particular share
     */
    async invite(payload) {
        if (!this.accountability?.user)
            throw new exceptions_1.ForbiddenException();
        const share = await this.readOne(payload.share, { fields: ['collection'] });
        const usersService = new users_1.UsersService({
            knex: this.knex,
            schema: this.schema,
        });
        const mailService = new mail_1.MailService({ schema: this.schema, accountability: this.accountability });
        const userInfo = await usersService.readOne(this.accountability.user, {
            fields: ['first_name', 'last_name', 'email', 'id'],
        });
        const message = `
Hello!

${(0, user_name_1.userName)(userInfo)} has invited you to view an item in ${share['collection']}.

[Open](${new url_1.Url(env_1.default['PUBLIC_URL']).addPath('admin', 'shared', payload.share).toString()})
`;
        for (const email of payload.emails) {
            await mailService.send({
                template: {
                    name: 'base',
                    data: {
                        html: (0, md_1.md)(message),
                    },
                },
                to: email,
                subject: `${(0, user_name_1.userName)(userInfo)} has shared an item with you`,
            });
        }
    }
}
exports.SharesService = SharesService;
