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
exports.createOpenIDAuthRouter = exports.OpenIDAuthDriver = void 0;
const exceptions_1 = require("@directus/shared/exceptions");
const utils_1 = require("@directus/shared/utils");
const express_1 = __importStar(require("express"));
const flat_1 = __importDefault(require("flat"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const openid_client_1 = require("openid-client");
const auth_1 = require("../../auth");
const env_1 = __importDefault(require("../../env"));
const exceptions_2 = require("../../exceptions");
const record_not_unique_1 = require("../../exceptions/database/record-not-unique");
const logger_1 = __importDefault(require("../../logger"));
const respond_1 = require("../../middleware/respond");
const services_1 = require("../../services");
const async_handler_1 = __importDefault(require("../../utils/async-handler"));
const get_config_from_env_1 = require("../../utils/get-config-from-env");
const get_ip_from_req_1 = require("../../utils/get-ip-from-req");
const get_milliseconds_1 = require("../../utils/get-milliseconds");
const url_1 = require("../../utils/url");
const local_1 = require("./local");
class OpenIDAuthDriver extends local_1.LocalAuthDriver {
    client;
    redirectUrl;
    usersService;
    config;
    constructor(options, config) {
        super(options, config);
        const { issuerUrl, clientId, clientSecret, ...additionalConfig } = config;
        if (!issuerUrl || !clientId || !clientSecret || !additionalConfig['provider']) {
            throw new exceptions_2.InvalidConfigException('Invalid provider config', { provider: additionalConfig['provider'] });
        }
        const redirectUrl = new url_1.Url(env_1.default['PUBLIC_URL']).addPath('auth', 'login', additionalConfig['provider'], 'callback');
        const clientOptionsOverrides = (0, get_config_from_env_1.getConfigFromEnv)(`AUTH_${config['provider'].toUpperCase()}_CLIENT_`, [`AUTH_${config['provider'].toUpperCase()}_CLIENT_ID`, `AUTH_${config['provider'].toUpperCase()}_CLIENT_SECRET`], 'underscore');
        this.redirectUrl = redirectUrl.toString();
        this.usersService = new services_1.UsersService({ knex: this.knex, schema: this.schema });
        this.config = additionalConfig;
        this.client = new Promise((resolve, reject) => {
            openid_client_1.Issuer.discover(issuerUrl)
                .then((issuer) => {
                const supportedTypes = issuer.metadata['response_types_supported'];
                if (!supportedTypes?.includes('code')) {
                    reject(new exceptions_2.InvalidConfigException('OpenID provider does not support required code flow', {
                        provider: additionalConfig['provider'],
                    }));
                }
                resolve(new issuer.Client({
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uris: [this.redirectUrl],
                    response_types: ['code'],
                    ...clientOptionsOverrides,
                }));
            })
                .catch((e) => {
                logger_1.default.error(e, '[OpenID] Failed to fetch provider config');
                process.exit(1);
            });
        });
    }
    generateCodeVerifier() {
        return openid_client_1.generators.codeVerifier();
    }
    async generateAuthUrl(codeVerifier, prompt = false) {
        try {
            const client = await this.client;
            const codeChallenge = openid_client_1.generators.codeChallenge(codeVerifier);
            const paramsConfig = typeof this.config['params'] === 'object' ? this.config['params'] : {};
            return client.authorizationUrl({
                scope: this.config['scope'] ?? 'openid profile email',
                access_type: 'offline',
                prompt: prompt ? 'consent' : undefined,
                ...paramsConfig,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                // Some providers require state even with PKCE
                state: codeChallenge,
                nonce: codeChallenge,
            });
        }
        catch (e) {
            throw handleError(e);
        }
    }
    async fetchUserId(identifier) {
        const user = await this.knex
            .select('id')
            .from('directus_users')
            .whereRaw('LOWER(??) = ?', ['external_identifier', identifier.toLowerCase()])
            .first();
        return user?.id;
    }
    async getUserID(payload) {
        if (!payload['code'] || !payload['codeVerifier'] || !payload['state']) {
            logger_1.default.warn('[OpenID] No code, codeVerifier or state in payload');
            throw new exceptions_2.InvalidCredentialsException();
        }
        let tokenSet;
        let userInfo;
        try {
            const client = await this.client;
            const codeChallenge = openid_client_1.generators.codeChallenge(payload['codeVerifier']);
            tokenSet = await client.callback(this.redirectUrl, { code: payload['code'], state: payload['state'] }, { code_verifier: payload['codeVerifier'], state: codeChallenge, nonce: codeChallenge });
            userInfo = tokenSet.claims();
            if (client.issuer.metadata['userinfo_endpoint']) {
                userInfo = {
                    ...userInfo,
                    ...(await client.userinfo(tokenSet.access_token)),
                };
            }
        }
        catch (e) {
            throw handleError(e);
        }
        // Flatten response to support dot indexes
        userInfo = (0, flat_1.default)(userInfo);
        const { provider, identifierKey, allowPublicRegistration, requireVerifiedEmail } = this.config;
        const email = userInfo['email'] ? String(userInfo['email']) : undefined;
        // Fallback to email if explicit identifier not found
        const identifier = userInfo[identifierKey ?? 'sub'] ? String(userInfo[identifierKey ?? 'sub']) : email;
        if (!identifier) {
            logger_1.default.warn(`[OpenID] Failed to find user identifier for provider "${provider}"`);
            throw new exceptions_2.InvalidCredentialsException();
        }
        const userId = await this.fetchUserId(identifier);
        if (userId) {
            // Update user refreshToken if provided
            if (tokenSet.refresh_token) {
                await this.usersService.updateOne(userId, {
                    auth_data: JSON.stringify({ refreshToken: tokenSet.refresh_token }),
                });
            }
            return userId;
        }
        const isEmailVerified = !requireVerifiedEmail || userInfo['email_verified'];
        // Is public registration allowed?
        if (!allowPublicRegistration || !isEmailVerified) {
            logger_1.default.warn(`[OpenID] User doesn't exist, and public registration not allowed for provider "${provider}"`);
            throw new exceptions_2.InvalidCredentialsException();
        }
        try {
            await this.usersService.createOne({
                provider,
                first_name: userInfo['given_name'],
                last_name: userInfo['family_name'],
                email: email,
                external_identifier: identifier,
                role: this.config['defaultRoleId'],
                auth_data: tokenSet.refresh_token && JSON.stringify({ refreshToken: tokenSet.refresh_token }),
            });
        }
        catch (e) {
            if (e instanceof record_not_unique_1.RecordNotUniqueException) {
                logger_1.default.warn(e, '[OpenID] Failed to register user. User not unique');
                throw new exceptions_2.InvalidProviderException();
            }
            throw e;
        }
        return (await this.fetchUserId(identifier));
    }
    async login(user) {
        return this.refresh(user);
    }
    async refresh(user) {
        let authData = user.auth_data;
        if (typeof authData === 'string') {
            try {
                authData = (0, utils_1.parseJSON)(authData);
            }
            catch {
                logger_1.default.warn(`[OpenID] Session data isn't valid JSON: ${authData}`);
            }
        }
        if (authData?.['refreshToken']) {
            try {
                const client = await this.client;
                const tokenSet = await client.refresh(authData['refreshToken']);
                // Update user refreshToken if provided
                if (tokenSet.refresh_token) {
                    await this.usersService.updateOne(user.id, {
                        auth_data: JSON.stringify({ refreshToken: tokenSet.refresh_token }),
                    });
                }
            }
            catch (e) {
                throw handleError(e);
            }
        }
    }
}
exports.OpenIDAuthDriver = OpenIDAuthDriver;
const handleError = (e) => {
    if (e instanceof openid_client_1.errors.OPError) {
        if (e.error === 'invalid_grant') {
            // Invalid token
            logger_1.default.trace(e, `[OpenID] Invalid grant`);
            return new exceptions_2.InvalidTokenException();
        }
        // Server response error
        logger_1.default.trace(e, `[OpenID] Unknown OP error`);
        return new exceptions_2.ServiceUnavailableException('Service returned unexpected response', {
            service: 'openid',
            message: e.error_description,
        });
    }
    else if (e instanceof openid_client_1.errors.RPError) {
        // Internal client error
        logger_1.default.trace(e, `[OpenID] Unknown RP error`);
        return new exceptions_2.InvalidCredentialsException();
    }
    logger_1.default.trace(e, `[OpenID] Unknown error`);
    return e;
};
function createOpenIDAuthRouter(providerName) {
    const router = (0, express_1.Router)();
    router.get('/', (0, async_handler_1.default)(async (req, res) => {
        const provider = (0, auth_1.getAuthProvider)(providerName);
        const codeVerifier = provider.generateCodeVerifier();
        const prompt = !!req.query['prompt'];
        const token = jsonwebtoken_1.default.sign({ verifier: codeVerifier, redirect: req.query['redirect'], prompt }, env_1.default['SECRET'], {
            expiresIn: '5m',
            issuer: 'directus',
        });
        res.cookie(`openid.${providerName}`, token, {
            httpOnly: true,
            sameSite: 'lax',
        });
        return res.redirect(await provider.generateAuthUrl(codeVerifier, prompt));
    }), respond_1.respond);
    router.post('/callback', express_1.default.urlencoded({ extended: false }), (req, res) => {
        res.redirect(303, `./callback?${new URLSearchParams(req.body)}`);
    }, respond_1.respond);
    router.get('/callback', (0, async_handler_1.default)(async (req, res, next) => {
        let tokenData;
        try {
            tokenData = jsonwebtoken_1.default.verify(req.cookies[`openid.${providerName}`], env_1.default['SECRET'], {
                issuer: 'directus',
            });
        }
        catch (e) {
            logger_1.default.warn(e, `[OpenID] Couldn't verify OpenID cookie`);
            throw new exceptions_2.InvalidCredentialsException();
        }
        const { verifier, redirect, prompt } = tokenData;
        const accountability = {
            ip: (0, get_ip_from_req_1.getIPFromReq)(req),
            role: null,
        };
        const userAgent = req.get('user-agent');
        if (userAgent)
            accountability.userAgent = userAgent;
        const origin = req.get('origin');
        if (origin)
            accountability.origin = origin;
        const authenticationService = new services_1.AuthenticationService({
            accountability,
            schema: req.schema,
        });
        let authResponse;
        try {
            res.clearCookie(`openid.${providerName}`);
            authResponse = await authenticationService.login(providerName, {
                code: req.query['code'],
                codeVerifier: verifier,
                state: req.query['state'],
            });
        }
        catch (error) {
            // Prompt user for a new refresh_token if invalidated
            if (error instanceof exceptions_2.InvalidTokenException && !prompt) {
                return res.redirect(`./?${redirect ? `redirect=${redirect}&` : ''}prompt=true`);
            }
            logger_1.default.warn(error);
            if (redirect) {
                let reason = 'UNKNOWN_EXCEPTION';
                if (error instanceof exceptions_1.BaseException) {
                    reason = error.code;
                }
                else {
                    logger_1.default.warn(error, `[OpenID] Unexpected error during OpenID login`);
                }
                return res.redirect(`${redirect.split('?')[0]}?reason=${reason}`);
            }
            logger_1.default.warn(error, `[OpenID] Unexpected error during OpenID login`);
            throw error;
        }
        const { accessToken, refreshToken, expires } = authResponse;
        if (redirect) {
            res.cookie(env_1.default['REFRESH_TOKEN_COOKIE_NAME'], refreshToken, {
                httpOnly: true,
                domain: env_1.default['REFRESH_TOKEN_COOKIE_DOMAIN'],
                maxAge: (0, get_milliseconds_1.getMilliseconds)(env_1.default['REFRESH_TOKEN_TTL']),
                secure: env_1.default['REFRESH_TOKEN_COOKIE_SECURE'] ?? false,
                sameSite: env_1.default['REFRESH_TOKEN_COOKIE_SAME_SITE'] || 'strict',
            });
            return res.redirect(redirect);
        }
        res.locals['payload'] = {
            data: { access_token: accessToken, refresh_token: refreshToken, expires },
        };
        next();
    }), respond_1.respond);
    return router;
}
exports.createOpenIDAuthRouter = createOpenIDAuthRouter;
