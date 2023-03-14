"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLDAPAuthRouter = exports.LDAPAuthDriver = void 0;
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const ldapjs_1 = __importStar(require("ldapjs"));
const env_1 = __importDefault(require("../../env"));
const exceptions_1 = require("../../exceptions");
const record_not_unique_1 = require("../../exceptions/database/record-not-unique");
const logger_1 = __importDefault(require("../../logger"));
const respond_1 = require("../../middleware/respond");
const services_1 = require("../../services");
const async_handler_1 = __importDefault(require("../../utils/async-handler"));
const get_ip_from_req_1 = require("../../utils/get-ip-from-req");
const get_milliseconds_1 = require("../../utils/get-milliseconds");
const auth_1 = require("../auth");
// 0x2: ACCOUNTDISABLE
// 0x10: LOCKOUT
// 0x800000: PASSWORD_EXPIRED
const INVALID_ACCOUNT_FLAGS = 0x800012;
class LDAPAuthDriver extends auth_1.AuthDriver {
    constructor(options, config) {
        var _a;
        super(options, config);
        const { bindDn, bindPassword, userDn, provider, clientUrl } = config;
        if (bindDn === undefined ||
            bindPassword === undefined ||
            !userDn ||
            !provider ||
            (!clientUrl && !((_a = config.client) === null || _a === void 0 ? void 0 : _a.socketPath))) {
            throw new exceptions_1.InvalidConfigException('Invalid provider config', { provider });
        }
        const clientConfig = typeof config.client === 'object' ? config.client : {};
        this.bindClient = ldapjs_1.default.createClient({ url: clientUrl, reconnect: true, ...clientConfig });
        this.bindClient.on('error', (err) => {
            logger_1.default.warn(err);
        });
        this.usersService = new services_1.UsersService({ knex: this.knex, schema: this.schema });
        this.config = config;
    }
    async validateBindClient() {
        const { bindDn, bindPassword, provider } = this.config;
        return new Promise((resolve, reject) => {
            // Healthcheck bind user
            this.bindClient.search(bindDn, {}, (err, res) => {
                if (err) {
                    reject(handleError(err));
                    return;
                }
                res.on('searchEntry', () => {
                    resolve();
                });
                res.on('error', () => {
                    // Attempt to rebind on search error
                    this.bindClient.bind(bindDn, bindPassword, (err) => {
                        if (err) {
                            const error = handleError(err);
                            if (error instanceof exceptions_1.InvalidCredentialsException) {
                                reject(new exceptions_1.InvalidConfigException('Invalid bind user', { provider }));
                            }
                            else {
                                reject(error);
                            }
                        }
                        else {
                            resolve();
                        }
                    });
                });
                res.on('end', (result) => {
                    // Handle edge case where authenticated bind user cannot read their own DN
                    if ((result === null || result === void 0 ? void 0 : result.status) === 0) {
                        reject(new exceptions_1.UnexpectedResponseException('Failed to find bind user record'));
                    }
                });
            });
        });
    }
    async fetchUserInfo(baseDn, filter, scope) {
        let { firstNameAttribute, lastNameAttribute, mailAttribute } = this.config;
        firstNameAttribute !== null && firstNameAttribute !== void 0 ? firstNameAttribute : (firstNameAttribute = 'givenName');
        lastNameAttribute !== null && lastNameAttribute !== void 0 ? lastNameAttribute : (lastNameAttribute = 'sn');
        mailAttribute !== null && mailAttribute !== void 0 ? mailAttribute : (mailAttribute = 'mail');
        return new Promise((resolve, reject) => {
            // Search for the user in LDAP by filter
            this.bindClient.search(baseDn, {
                filter,
                scope,
                attributes: ['uid', firstNameAttribute, lastNameAttribute, mailAttribute, 'userAccountControl'],
            }, (err, res) => {
                if (err) {
                    reject(handleError(err));
                    return;
                }
                res.on('searchEntry', ({ object }) => {
                    var _a;
                    const user = {
                        dn: object.dn,
                        uid: getEntryValue(object.uid),
                        firstName: getEntryValue(object[firstNameAttribute]),
                        lastName: getEntryValue(object[lastNameAttribute]),
                        email: getEntryValue(object[mailAttribute]),
                        userAccountControl: Number((_a = getEntryValue(object.userAccountControl)) !== null && _a !== void 0 ? _a : 0),
                    };
                    resolve(user);
                });
                res.on('error', (err) => {
                    reject(handleError(err));
                });
                res.on('end', () => {
                    resolve(undefined);
                });
            });
        });
    }
    async fetchUserGroups(baseDn, filter, scope) {
        return new Promise((resolve, reject) => {
            let userGroups = [];
            // Search for the user info in LDAP by group attribute
            this.bindClient.search(baseDn, {
                filter,
                scope,
                attributes: ['cn'],
            }, (err, res) => {
                if (err) {
                    reject(handleError(err));
                    return;
                }
                res.on('searchEntry', ({ object }) => {
                    if (typeof object.cn === 'object') {
                        userGroups = [...userGroups, ...object.cn];
                    }
                    else if (object.cn) {
                        userGroups.push(object.cn);
                    }
                });
                res.on('error', (err) => {
                    reject(handleError(err));
                });
                res.on('end', () => {
                    resolve(userGroups);
                });
            });
        });
    }
    async fetchUserId(userDn) {
        const user = await this.knex
            .select('id')
            .from('directus_users')
            .orWhereRaw('LOWER(??) = ?', ['external_identifier', userDn.toLowerCase()])
            .first();
        return user === null || user === void 0 ? void 0 : user.id;
    }
    async getUserID(payload) {
        var _a, _b, _c;
        if (!payload.identifier) {
            throw new exceptions_1.InvalidCredentialsException();
        }
        await this.validateBindClient();
        const { userDn, userScope, userAttribute, groupDn, groupScope, groupAttribute, defaultRoleId } = this.config;
        const userInfo = await this.fetchUserInfo(userDn, new ldapjs_1.EqualityFilter({
            attribute: userAttribute !== null && userAttribute !== void 0 ? userAttribute : 'cn',
            value: payload.identifier,
        }), userScope !== null && userScope !== void 0 ? userScope : 'one');
        if (!(userInfo === null || userInfo === void 0 ? void 0 : userInfo.dn)) {
            throw new exceptions_1.InvalidCredentialsException();
        }
        let userRole;
        if (groupDn) {
            const userGroups = await this.fetchUserGroups(groupDn, new ldapjs_1.EqualityFilter({
                attribute: groupAttribute !== null && groupAttribute !== void 0 ? groupAttribute : 'member',
                value: (groupAttribute === null || groupAttribute === void 0 ? void 0 : groupAttribute.toLowerCase()) === 'memberuid' && userInfo.uid ? userInfo.uid : userInfo.dn,
            }), groupScope !== null && groupScope !== void 0 ? groupScope : 'one');
            if (userGroups.length) {
                userRole = await this.knex
                    .select('id')
                    .from('directus_roles')
                    .whereRaw(`LOWER(??) IN (${userGroups.map(() => '?')})`, [
                    'name',
                    ...userGroups.map((group) => group.toLowerCase()),
                ])
                    .first();
            }
        }
        const userId = await this.fetchUserId(userInfo.dn);
        if (userId) {
            // Only sync roles if the AD groups are configured
            if (groupDn) {
                await this.usersService.updateOne(userId, { role: (_b = (_a = userRole === null || userRole === void 0 ? void 0 : userRole.id) !== null && _a !== void 0 ? _a : defaultRoleId) !== null && _b !== void 0 ? _b : null });
            }
            return userId;
        }
        if (!userInfo) {
            throw new exceptions_1.InvalidCredentialsException();
        }
        try {
            await this.usersService.createOne({
                provider: this.config.provider,
                first_name: userInfo.firstName,
                last_name: userInfo.lastName,
                email: userInfo.email,
                external_identifier: userInfo.dn,
                role: (_c = userRole === null || userRole === void 0 ? void 0 : userRole.id) !== null && _c !== void 0 ? _c : defaultRoleId,
            });
        }
        catch (e) {
            if (e instanceof record_not_unique_1.RecordNotUniqueException) {
                logger_1.default.warn(e, '[LDAP] Failed to register user. User not unique');
                throw new exceptions_1.InvalidProviderException();
            }
            throw e;
        }
        return (await this.fetchUserId(userInfo.dn));
    }
    async verify(user, password) {
        if (!user.external_identifier || !password) {
            throw new exceptions_1.InvalidCredentialsException();
        }
        return new Promise((resolve, reject) => {
            const clientConfig = typeof this.config.client === 'object' ? this.config.client : {};
            const client = ldapjs_1.default.createClient({
                url: this.config.clientUrl,
                ...clientConfig,
                reconnect: false,
            });
            client.on('error', (err) => {
                reject(handleError(err));
            });
            client.bind(user.external_identifier, password, (err) => {
                if (err) {
                    reject(handleError(err));
                }
                else {
                    resolve();
                }
                client.destroy();
            });
        });
    }
    async login(user, payload) {
        await this.verify(user, payload.password);
    }
    async refresh(user) {
        await this.validateBindClient();
        const userInfo = await this.fetchUserInfo(user.external_identifier);
        if ((userInfo === null || userInfo === void 0 ? void 0 : userInfo.userAccountControl) && userInfo.userAccountControl & INVALID_ACCOUNT_FLAGS) {
            throw new exceptions_1.InvalidCredentialsException();
        }
    }
}
exports.LDAPAuthDriver = LDAPAuthDriver;
const handleError = (e) => {
    if (e instanceof ldapjs_1.InappropriateAuthenticationError ||
        e instanceof ldapjs_1.InvalidCredentialsError ||
        e instanceof ldapjs_1.InsufficientAccessRightsError) {
        return new exceptions_1.InvalidCredentialsException();
    }
    return new exceptions_1.ServiceUnavailableException('Service returned unexpected error', {
        service: 'ldap',
        message: e.message,
    });
};
const getEntryValue = (value) => {
    return typeof value === 'object' ? value[0] : value;
};
function createLDAPAuthRouter(provider) {
    const router = (0, express_1.Router)();
    const loginSchema = joi_1.default.object({
        identifier: joi_1.default.string().required(),
        password: joi_1.default.string().required(),
        mode: joi_1.default.string().valid('cookie', 'json'),
        otp: joi_1.default.string(),
    }).unknown();
    router.post('/', (0, async_handler_1.default)(async (req, res, next) => {
        var _a, _b;
        const accountability = {
            ip: (0, get_ip_from_req_1.getIPFromReq)(req),
            userAgent: req.get('user-agent'),
            origin: req.get('origin'),
            role: null,
        };
        const authenticationService = new services_1.AuthenticationService({
            accountability: accountability,
            schema: req.schema,
        });
        const { error } = loginSchema.validate(req.body);
        if (error) {
            throw new exceptions_1.InvalidPayloadException(error.message);
        }
        const mode = req.body.mode || 'json';
        const { accessToken, refreshToken, expires } = await authenticationService.login(provider, req.body, (_a = req.body) === null || _a === void 0 ? void 0 : _a.otp);
        const payload = {
            data: { access_token: accessToken, expires },
        };
        if (mode === 'json') {
            payload.data.refresh_token = refreshToken;
        }
        if (mode === 'cookie') {
            res.cookie(env_1.default.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
                httpOnly: true,
                domain: env_1.default.REFRESH_TOKEN_COOKIE_DOMAIN,
                maxAge: (0, get_milliseconds_1.getMilliseconds)(env_1.default.REFRESH_TOKEN_TTL),
                secure: (_b = env_1.default.REFRESH_TOKEN_COOKIE_SECURE) !== null && _b !== void 0 ? _b : false,
                sameSite: env_1.default.REFRESH_TOKEN_COOKIE_SAME_SITE || 'strict',
            });
        }
        res.locals.payload = payload;
        return next();
    }), respond_1.respond);
    return router;
}
exports.createLDAPAuthRouter = createLDAPAuthRouter;
