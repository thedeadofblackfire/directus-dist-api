import { RequestHandler } from 'express';
import { RateLimiterMemcache, RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
declare let checkRateLimit: RequestHandler;
export declare let rateLimiterGlobal: RateLimiterRedis | RateLimiterMemcache | RateLimiterMemory;
export default checkRateLimit;
