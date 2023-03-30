"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const types_1 = require("@directus/shared/types");
const lodash_1 = require("lodash");
const uuid_validate_1 = __importDefault(require("uuid-validate"));
const env_1 = __importDefault(require("../env"));
const forbidden_1 = require("../exceptions/forbidden");
const logger_1 = __importDefault(require("../logger"));
const get_permissions_1 = require("../utils/get-permissions");
const url_1 = require("../utils/url");
const user_name_1 = require("../utils/user-name");
const authorization_1 = require("./authorization");
const items_1 = require("./items");
const notifications_1 = require("./notifications");
const users_1 = require("./users");
class ActivityService extends items_1.ItemsService {
    notificationsService;
    usersService;
    constructor(options) {
        super('directus_activity', options);
        this.notificationsService = new notifications_1.NotificationsService({ schema: this.schema });
        this.usersService = new users_1.UsersService({ schema: this.schema });
    }
    async createOne(data, opts) {
        if (data['action'] === types_1.Action.COMMENT && typeof data['comment'] === 'string') {
            const usersRegExp = new RegExp(/@[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/gi);
            const mentions = (0, lodash_1.uniq)(data['comment'].match(usersRegExp) ?? []);
            const sender = await this.usersService.readOne(this.accountability.user, {
                fields: ['id', 'first_name', 'last_name', 'email'],
            });
            for (const mention of mentions) {
                const userID = mention.substring(1);
                const user = await this.usersService.readOne(userID, {
                    fields: ['id', 'first_name', 'last_name', 'email', 'role.id', 'role.admin_access', 'role.app_access'],
                });
                const accountability = {
                    user: userID,
                    role: user['role']?.id ?? null,
                    admin: user['role']?.admin_access ?? null,
                    app: user['role']?.app_access ?? null,
                };
                accountability.permissions = await (0, get_permissions_1.getPermissions)(accountability, this.schema);
                const authorizationService = new authorization_1.AuthorizationService({ schema: this.schema, accountability });
                const usersService = new users_1.UsersService({ schema: this.schema, accountability });
                try {
                    await authorizationService.checkAccess('read', data['collection'], data['item']);
                    const templateData = await usersService.readByQuery({
                        fields: ['id', 'first_name', 'last_name', 'email'],
                        filter: { id: { _in: mentions.map((mention) => mention.substring(1)) } },
                    });
                    const userPreviews = templateData.reduce((acc, user) => {
                        acc[user['id']] = `<em>${(0, user_name_1.userName)(user)}</em>`;
                        return acc;
                    }, {});
                    let comment = data['comment'];
                    for (const mention of mentions) {
                        const uuid = mention.substring(1);
                        // We only match on UUIDs in the first place. This is just an extra sanity check
                        if ((0, uuid_validate_1.default)(uuid) === false)
                            continue;
                        comment = comment.replace(new RegExp(mention, 'gm'), userPreviews[uuid] ?? '@Unknown User');
                    }
                    comment = `> ${comment.replace(/\n+/gm, '\n> ')}`;
                    const message = `
Hello ${(0, user_name_1.userName)(user)},

${(0, user_name_1.userName)(sender)} has mentioned you in a comment:

${comment}

<a href="${new url_1.Url(env_1.default['PUBLIC_URL'])
                        .addPath('admin', 'content', data['collection'], data['item'])
                        .toString()}">Click here to view.</a>
`;
                    await this.notificationsService.createOne({
                        recipient: userID,
                        sender: sender['id'],
                        subject: `You were mentioned in ${data['collection']}`,
                        message,
                        collection: data['collection'],
                        item: data['item'],
                    });
                }
                catch (err) {
                    if (err instanceof forbidden_1.ForbiddenException) {
                        logger_1.default.warn(`User ${userID} doesn't have proper permissions to receive notification for this item.`);
                    }
                    else {
                        throw err;
                    }
                }
            }
        }
        return super.createOne(data, opts);
    }
}
exports.ActivityService = ActivityService;
