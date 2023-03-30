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
exports.ServerService = void 0;
const lodash_1 = require("lodash");
const os_1 = __importDefault(require("os"));
const perf_hooks_1 = require("perf_hooks");
const utils_1 = require("@directus/shared/utils");
const node_stream_1 = require("node:stream");
// @ts-ignore
const package_json_1 = require("../../package.json");
const cache_1 = require("../cache");
const database_1 = __importStar(require("../database"));
const env_1 = __importDefault(require("../env"));
const logger_1 = __importDefault(require("../logger"));
const mailer_1 = __importDefault(require("../mailer"));
const rate_limiter_global_1 = require("../middleware/rate-limiter-global");
const rate_limiter_ip_1 = require("../middleware/rate-limiter-ip");
const storage_1 = require("../storage");
const get_os_info_1 = require("../utils/get-os-info");
const settings_1 = require("./settings");
class ServerService {
    knex;
    accountability;
    settingsService;
    schema;
    constructor(options) {
        this.knex = options.knex || (0, database_1.default)();
        this.accountability = options.accountability || null;
        this.schema = options.schema;
        this.settingsService = new settings_1.SettingsService({ knex: this.knex, schema: this.schema });
    }
    async serverInfo() {
        const info = {};
        const projectInfo = await this.settingsService.readSingleton({
            fields: [
                'project_name',
                'project_descriptor',
                'project_logo',
                'project_color',
                'default_language',
                'public_foreground',
                'public_background',
                'public_note',
                'custom_css',
            ],
        });
        info['project'] = projectInfo;
        if (this.accountability?.user) {
            if (env_1.default['RATE_LIMITER_ENABLED']) {
                info['rateLimit'] = {
                    points: env_1.default['RATE_LIMITER_POINTS'],
                    duration: env_1.default['RATE_LIMITER_DURATION'],
                };
            }
            else {
                info['rateLimit'] = false;
            }
            if (env_1.default['RATE_LIMITER_GLOBAL_ENABLED']) {
                info['rateLimitGlobal'] = {
                    points: env_1.default['RATE_LIMITER_GLOBAL_POINTS'],
                    duration: env_1.default['RATE_LIMITER_GLOBAL_DURATION'],
                };
            }
            else {
                info['rateLimitGlobal'] = false;
            }
            info['flows'] = {
                execAllowedModules: env_1.default['FLOWS_EXEC_ALLOWED_MODULES'] ? (0, utils_1.toArray)(env_1.default['FLOWS_EXEC_ALLOWED_MODULES']) : [],
            };
        }
        if (this.accountability?.admin === true) {
            const { osType, osVersion } = (0, get_os_info_1.getOSInfo)();
            info['directus'] = {
                version: package_json_1.version,
            };
            info['node'] = {
                version: process.versions.node,
                uptime: Math.round(process.uptime()),
            };
            info['os'] = {
                type: osType,
                version: osVersion,
                uptime: Math.round(os_1.default.uptime()),
                totalmem: os_1.default.totalmem(),
            };
        }
        return info;
    }
    async health() {
        const { nanoid } = await import('nanoid');
        const checkID = nanoid(5);
        const data = {
            status: 'ok',
            releaseId: package_json_1.version,
            serviceId: env_1.default['KEY'],
            checks: (0, lodash_1.merge)(...(await Promise.all([
                testDatabase(),
                testCache(),
                testRateLimiter(),
                testRateLimiterGlobal(),
                testStorage(),
                testEmail(),
            ]))),
        };
        for (const [service, healthData] of Object.entries(data.checks)) {
            for (const healthCheck of healthData) {
                if (healthCheck.status === 'warn' && data.status === 'ok') {
                    logger_1.default.warn(`${service} in WARN state, the observed value ${healthCheck.observedValue} is above the threshold of ${healthCheck.threshold}${healthCheck.observedUnit}`);
                    data.status = 'warn';
                    continue;
                }
                if (healthCheck.status === 'error' && (data.status === 'ok' || data.status === 'warn')) {
                    logger_1.default.error(healthCheck.output, '%s in ERROR state', service);
                    data.status = 'error';
                    break;
                }
            }
            // No need to continue checking if parent status is already error
            if (data.status === 'error')
                break;
        }
        if (this.accountability?.admin !== true) {
            return { status: data.status };
        }
        else {
            return data;
        }
        async function testDatabase() {
            const database = (0, database_1.default)();
            const client = env_1.default['DB_CLIENT'];
            const checks = {};
            // Response time
            // ----------------------------------------------------------------------------------------
            checks[`${client}:responseTime`] = [
                {
                    status: 'ok',
                    componentType: 'datastore',
                    observedUnit: 'ms',
                    observedValue: 0,
                    threshold: env_1.default['DB_HEALTHCHECK_THRESHOLD'] ? +env_1.default['DB_HEALTHCHECK_THRESHOLD'] : 150,
                },
            ];
            const startTime = perf_hooks_1.performance.now();
            if (await (0, database_1.hasDatabaseConnection)()) {
                checks[`${client}:responseTime`][0].status = 'ok';
            }
            else {
                checks[`${client}:responseTime`][0].status = 'error';
                checks[`${client}:responseTime`][0].output = `Can't connect to the database.`;
            }
            const endTime = perf_hooks_1.performance.now();
            checks[`${client}:responseTime`][0].observedValue = +(endTime - startTime).toFixed(3);
            if (checks[`${client}:responseTime`][0].observedValue > checks[`${client}:responseTime`][0].threshold &&
                checks[`${client}:responseTime`][0].status !== 'error') {
                checks[`${client}:responseTime`][0].status = 'warn';
            }
            checks[`${client}:connectionsAvailable`] = [
                {
                    status: 'ok',
                    componentType: 'datastore',
                    observedValue: database.client.pool.numFree(),
                },
            ];
            checks[`${client}:connectionsUsed`] = [
                {
                    status: 'ok',
                    componentType: 'datastore',
                    observedValue: database.client.pool.numUsed(),
                },
            ];
            return checks;
        }
        async function testCache() {
            if (env_1.default['CACHE_ENABLED'] !== true) {
                return {};
            }
            const { cache } = (0, cache_1.getCache)();
            const checks = {
                'cache:responseTime': [
                    {
                        status: 'ok',
                        componentType: 'cache',
                        observedValue: 0,
                        observedUnit: 'ms',
                        threshold: env_1.default['CACHE_HEALTHCHECK_THRESHOLD'] ? +env_1.default['CACHE_HEALTHCHECK_THRESHOLD'] : 150,
                    },
                ],
            };
            const startTime = perf_hooks_1.performance.now();
            try {
                await cache.set(`health-${checkID}`, true, 5);
                await cache.delete(`health-${checkID}`);
            }
            catch (err) {
                checks['cache:responseTime'][0].status = 'error';
                checks['cache:responseTime'][0].output = err;
            }
            finally {
                const endTime = perf_hooks_1.performance.now();
                checks['cache:responseTime'][0].observedValue = +(endTime - startTime).toFixed(3);
                if (checks['cache:responseTime'][0].observedValue > checks['cache:responseTime'][0].threshold &&
                    checks['cache:responseTime'][0].status !== 'error') {
                    checks['cache:responseTime'][0].status = 'warn';
                }
            }
            return checks;
        }
        async function testRateLimiter() {
            if (env_1.default['RATE_LIMITER_ENABLED'] !== true) {
                return {};
            }
            const checks = {
                'rateLimiter:responseTime': [
                    {
                        status: 'ok',
                        componentType: 'ratelimiter',
                        observedValue: 0,
                        observedUnit: 'ms',
                        threshold: env_1.default['RATE_LIMITER_HEALTHCHECK_THRESHOLD'] ? +env_1.default['RATE_LIMITER_HEALTHCHECK_THRESHOLD'] : 150,
                    },
                ],
            };
            const startTime = perf_hooks_1.performance.now();
            try {
                await rate_limiter_ip_1.rateLimiter.consume(`health-${checkID}`, 1);
                await rate_limiter_ip_1.rateLimiter.delete(`health-${checkID}`);
            }
            catch (err) {
                checks['rateLimiter:responseTime'][0].status = 'error';
                checks['rateLimiter:responseTime'][0].output = err;
            }
            finally {
                const endTime = perf_hooks_1.performance.now();
                checks['rateLimiter:responseTime'][0].observedValue = +(endTime - startTime).toFixed(3);
                if (checks['rateLimiter:responseTime'][0].observedValue > checks['rateLimiter:responseTime'][0].threshold &&
                    checks['rateLimiter:responseTime'][0].status !== 'error') {
                    checks['rateLimiter:responseTime'][0].status = 'warn';
                }
            }
            return checks;
        }
        async function testRateLimiterGlobal() {
            if (env_1.default['RATE_LIMITER_GLOBAL_ENABLED'] !== true) {
                return {};
            }
            const checks = {
                'rateLimiterGlobal:responseTime': [
                    {
                        status: 'ok',
                        componentType: 'ratelimiter',
                        observedValue: 0,
                        observedUnit: 'ms',
                        threshold: env_1.default['RATE_LIMITER_GLOBAL_HEALTHCHECK_THRESHOLD']
                            ? +env_1.default['RATE_LIMITER_GLOBAL_HEALTHCHECK_THRESHOLD']
                            : 150,
                    },
                ],
            };
            const startTime = perf_hooks_1.performance.now();
            try {
                await rate_limiter_global_1.rateLimiterGlobal.consume(`health-${checkID}`, 1);
                await rate_limiter_global_1.rateLimiterGlobal.delete(`health-${checkID}`);
            }
            catch (err) {
                checks['rateLimiterGlobal:responseTime'][0].status = 'error';
                checks['rateLimiterGlobal:responseTime'][0].output = err;
            }
            finally {
                const endTime = perf_hooks_1.performance.now();
                checks['rateLimiterGlobal:responseTime'][0].observedValue = +(endTime - startTime).toFixed(3);
                if (checks['rateLimiterGlobal:responseTime'][0].observedValue >
                    checks['rateLimiterGlobal:responseTime'][0].threshold &&
                    checks['rateLimiterGlobal:responseTime'][0].status !== 'error') {
                    checks['rateLimiterGlobal:responseTime'][0].status = 'warn';
                }
            }
            return checks;
        }
        async function testStorage() {
            const storage = await (0, storage_1.getStorage)();
            const checks = {};
            for (const location of (0, utils_1.toArray)(env_1.default['STORAGE_LOCATIONS'])) {
                const disk = storage.location(location);
                const envThresholdKey = `STORAGE_${location}_HEALTHCHECK_THRESHOLD`.toUpperCase();
                checks[`storage:${location}:responseTime`] = [
                    {
                        status: 'ok',
                        componentType: 'objectstore',
                        observedValue: 0,
                        observedUnit: 'ms',
                        threshold: env_1.default[envThresholdKey] ? +env_1.default[envThresholdKey] : 750,
                    },
                ];
                const startTime = perf_hooks_1.performance.now();
                try {
                    await disk.write(`health-${checkID}`, node_stream_1.Readable.from(['check']));
                    const fileStream = await disk.read(`health-${checkID}`);
                    fileStream.on('data', async () => {
                        fileStream.destroy();
                        await disk.delete(`health-${checkID}`);
                    });
                }
                catch (err) {
                    checks[`storage:${location}:responseTime`][0].status = 'error';
                    checks[`storage:${location}:responseTime`][0].output = err;
                }
                finally {
                    const endTime = perf_hooks_1.performance.now();
                    checks[`storage:${location}:responseTime`][0].observedValue = +(endTime - startTime).toFixed(3);
                    if (checks[`storage:${location}:responseTime`][0].observedValue >
                        checks[`storage:${location}:responseTime`][0].threshold &&
                        checks[`storage:${location}:responseTime`][0].status !== 'error') {
                        checks[`storage:${location}:responseTime`][0].status = 'warn';
                    }
                }
            }
            return checks;
        }
        async function testEmail() {
            const checks = {
                'email:connection': [
                    {
                        status: 'ok',
                        componentType: 'email',
                    },
                ],
            };
            const mailer = (0, mailer_1.default)();
            try {
                await mailer.verify();
            }
            catch (err) {
                checks['email:connection'][0].status = 'error';
                checks['email:connection'][0].output = err;
            }
            return checks;
        }
    }
}
exports.ServerService = ServerService;
