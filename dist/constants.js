"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDACT_TEXT = exports.OAS_REQUIRED_SCHEMAS = exports.COOKIE_OPTIONS = exports.UUID_REGEX = exports.GENERATE_SPECIAL = exports.COLUMN_TRANSFORMS = exports.DEFAULT_AUTH_PROVIDER = exports.ALIAS_TYPES = exports.FILTER_VARIABLES = exports.ASSET_TRANSFORM_QUERY_KEYS = exports.SYSTEM_ASSET_ALLOW_LIST = void 0;
const env_1 = __importDefault(require("./env"));
const get_milliseconds_1 = require("./utils/get-milliseconds");
exports.SYSTEM_ASSET_ALLOW_LIST = [
    {
        key: 'system-small-cover',
        transforms: [['resize', { width: 64, height: 64, fit: 'cover' }]],
    },
    {
        key: 'system-small-contain',
        transforms: [['resize', { width: 64, fit: 'contain' }]],
    },
    {
        key: 'system-medium-cover',
        transforms: [['resize', { width: 300, height: 300, fit: 'cover' }]],
    },
    {
        key: 'system-medium-contain',
        transforms: [['resize', { width: 300, fit: 'contain' }]],
    },
    {
        key: 'system-large-cover',
        transforms: [['resize', { width: 800, height: 800, fit: 'cover' }]],
    },
    {
        key: 'system-large-contain',
        transforms: [['resize', { width: 800, fit: 'contain' }]],
    },
];
exports.ASSET_TRANSFORM_QUERY_KEYS = [
    'key',
    'transforms',
    'width',
    'height',
    'format',
    'fit',
    'quality',
    'withoutEnlargement',
];
exports.FILTER_VARIABLES = ['$NOW', '$CURRENT_USER', '$CURRENT_ROLE'];
exports.ALIAS_TYPES = ['alias', 'o2m', 'm2m', 'm2a', 'o2a', 'files', 'translations'];
exports.DEFAULT_AUTH_PROVIDER = 'default';
exports.COLUMN_TRANSFORMS = ['year', 'month', 'day', 'weekday', 'hour', 'minute', 'second'];
exports.GENERATE_SPECIAL = ['uuid', 'date-created', 'role-created', 'user-created'];
exports.UUID_REGEX = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
exports.COOKIE_OPTIONS = {
    httpOnly: true,
    domain: env_1.default['REFRESH_TOKEN_COOKIE_DOMAIN'],
    maxAge: (0, get_milliseconds_1.getMilliseconds)(env_1.default['REFRESH_TOKEN_TTL']),
    secure: env_1.default['REFRESH_TOKEN_COOKIE_SECURE'] ?? false,
    sameSite: env_1.default['REFRESH_TOKEN_COOKIE_SAME_SITE'] || 'strict',
};
exports.OAS_REQUIRED_SCHEMAS = ['Diff', 'Schema', 'Query', 'x-metadata'];
exports.REDACT_TEXT = '--redact--';
