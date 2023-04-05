import type { CookieOptions } from 'express';
import type { TransformationParams } from './types/index.js';
export declare const SYSTEM_ASSET_ALLOW_LIST: TransformationParams[];
export declare const ASSET_TRANSFORM_QUERY_KEYS: string[];
export declare const FILTER_VARIABLES: string[];
export declare const ALIAS_TYPES: string[];
export declare const DEFAULT_AUTH_PROVIDER = "default";
export declare const COLUMN_TRANSFORMS: string[];
export declare const GENERATE_SPECIAL: string[];
export declare const UUID_REGEX = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export declare const COOKIE_OPTIONS: CookieOptions;
export declare const OAS_REQUIRED_SCHEMAS: string[];
export declare const REDACT_TEXT = "--redact--";
