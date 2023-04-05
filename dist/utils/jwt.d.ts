import type { DirectusTokenPayload } from '../types/index.js';
export declare function verifyAccessJWT(token: string, secret: string): DirectusTokenPayload;
