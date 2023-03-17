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
exports.getFlowManager = void 0;
const sharedExceptions = __importStar(require("@directus/shared/exceptions"));
const types_1 = require("@directus/shared/types");
const utils_1 = require("@directus/shared/utils");
const fast_redact_1 = __importDefault(require("fast-redact"));
const lodash_1 = require("lodash");
const micromustache_1 = require("micromustache");
const node_cron_1 = require("node-cron");
const database_1 = __importDefault(require("./database"));
const emitter_1 = __importDefault(require("./emitter"));
const env_1 = __importDefault(require("./env"));
const exceptions = __importStar(require("./exceptions"));
const logger_1 = __importDefault(require("./logger"));
const messenger_1 = require("./messenger");
const services = __importStar(require("./services"));
const services_1 = require("./services");
const activity_1 = require("./services/activity");
const revisions_1 = require("./services/revisions");
const construct_flow_tree_1 = require("./utils/construct-flow-tree");
const get_schema_1 = require("./utils/get-schema");
const job_queue_1 = require("./utils/job-queue");
const map_values_deep_1 = require("./utils/map-values-deep");
let flowManager;
const redactLogs = (0, fast_redact_1.default)({
    censor: '--redacted--',
    paths: ['*.headers.authorization', '*.access_token', '*.headers.cookie'],
    serialize: false,
});
function getFlowManager() {
    if (flowManager) {
        return flowManager;
    }
    flowManager = new FlowManager();
    return flowManager;
}
exports.getFlowManager = getFlowManager;
const TRIGGER_KEY = '$trigger';
const ACCOUNTABILITY_KEY = '$accountability';
const LAST_KEY = '$last';
const ENV_KEY = '$env';
class FlowManager {
    constructor() {
        this.isLoaded = false;
        this.operations = {};
        this.triggerHandlers = [];
        this.operationFlowHandlers = {};
        this.webhookFlowHandlers = {};
        this.reloadQueue = new job_queue_1.JobQueue();
        const messenger = (0, messenger_1.getMessenger)();
        messenger.subscribe('flows', (event) => {
            if (event.type === 'reload') {
                this.reloadQueue.enqueue(async () => {
                    if (this.isLoaded) {
                        await this.unload();
                        await this.load();
                    }
                    else {
                        logger_1.default.warn('Flows have to be loaded before they can be reloaded');
                    }
                });
            }
        });
    }
    async initialize() {
        if (!this.isLoaded) {
            await this.load();
        }
    }
    async reload() {
        const messenger = (0, messenger_1.getMessenger)();
        messenger.publish('flows', { type: 'reload' });
    }
    addOperation(id, operation) {
        this.operations[id] = operation;
    }
    clearOperations() {
        this.operations = {};
    }
    async runOperationFlow(id, data, context) {
        if (!(id in this.operationFlowHandlers)) {
            logger_1.default.warn(`Couldn't find operation triggered flow with id "${id}"`);
            return null;
        }
        const handler = this.operationFlowHandlers[id];
        return handler(data, context);
    }
    async runWebhookFlow(id, data, context) {
        if (!(id in this.webhookFlowHandlers)) {
            logger_1.default.warn(`Couldn't find webhook or manual triggered flow with id "${id}"`);
            throw new exceptions.ForbiddenException();
        }
        const handler = this.webhookFlowHandlers[id];
        return handler(data, context);
    }
    async load() {
        var _a, _b, _c, _d;
        const flowsService = new services_1.FlowsService({ knex: (0, database_1.default)(), schema: await (0, get_schema_1.getSchema)() });
        const flows = await flowsService.readByQuery({
            filter: { status: { _eq: 'active' } },
            fields: ['*', 'operations.*'],
            limit: -1,
        });
        const flowTrees = flows.map((flow) => (0, construct_flow_tree_1.constructFlowTree)(flow));
        for (const flow of flowTrees) {
            if (flow.trigger === 'event') {
                let events = [];
                if ((_a = flow.options) === null || _a === void 0 ? void 0 : _a.scope) {
                    events = (0, utils_1.toArray)(flow.options.scope)
                        .map((scope) => {
                        var _a;
                        if (['items.create', 'items.update', 'items.delete'].includes(scope)) {
                            if (!((_a = flow.options) === null || _a === void 0 ? void 0 : _a.collections))
                                return [];
                            return (0, utils_1.toArray)(flow.options.collections).map((collection) => {
                                if (collection.startsWith('directus_')) {
                                    const action = scope.split('.')[1];
                                    return collection.substring(9) + '.' + action;
                                }
                                return `${collection}.${scope}`;
                            });
                        }
                        return scope;
                    })
                        .flat();
                }
                if (flow.options.type === 'filter') {
                    const handler = (payload, meta, context) => this.executeFlow(flow, { payload, ...meta }, {
                        accountability: context.accountability,
                        database: context.database,
                        getSchema: context.schema ? () => context.schema : get_schema_1.getSchema,
                    });
                    events.forEach((event) => emitter_1.default.onFilter(event, handler));
                    this.triggerHandlers.push({
                        id: flow.id,
                        events: events.map((event) => ({ type: 'filter', name: event, handler })),
                    });
                }
                else if (flow.options.type === 'action') {
                    const handler = (meta, context) => this.executeFlow(flow, meta, {
                        accountability: context.accountability,
                        database: (0, database_1.default)(),
                        getSchema: context.schema ? () => context.schema : get_schema_1.getSchema,
                    });
                    events.forEach((event) => emitter_1.default.onAction(event, handler));
                    this.triggerHandlers.push({
                        id: flow.id,
                        events: events.map((event) => ({ type: 'action', name: event, handler })),
                    });
                }
            }
            else if (flow.trigger === 'schedule') {
                if ((0, node_cron_1.validate)(flow.options.cron)) {
                    const task = (0, node_cron_1.schedule)(flow.options.cron, async () => {
                        try {
                            await this.executeFlow(flow);
                        }
                        catch (error) {
                            logger_1.default.error(error);
                        }
                    });
                    this.triggerHandlers.push({ id: flow.id, events: [{ type: flow.trigger, task }] });
                }
                else {
                    logger_1.default.warn(`Couldn't register cron trigger. Provided cron is invalid: ${flow.options.cron}`);
                }
            }
            else if (flow.trigger === 'operation') {
                const handler = (data, context) => this.executeFlow(flow, data, context);
                this.operationFlowHandlers[flow.id] = handler;
            }
            else if (flow.trigger === 'webhook') {
                const handler = (data, context) => {
                    if (flow.options.async) {
                        this.executeFlow(flow, data, context);
                    }
                    else {
                        return this.executeFlow(flow, data, context);
                    }
                };
                const method = (_c = (_b = flow.options) === null || _b === void 0 ? void 0 : _b.method) !== null && _c !== void 0 ? _c : 'GET';
                // Default return to $last for webhooks
                flow.options.return = (_d = flow.options.return) !== null && _d !== void 0 ? _d : '$last';
                this.webhookFlowHandlers[`${method}-${flow.id}`] = handler;
            }
            else if (flow.trigger === 'manual') {
                const handler = (data, context) => {
                    var _a, _b;
                    const enabledCollections = (_b = (_a = flow.options) === null || _a === void 0 ? void 0 : _a.collections) !== null && _b !== void 0 ? _b : [];
                    const targetCollection = data === null || data === void 0 ? void 0 : data.body.collection;
                    if (!targetCollection) {
                        logger_1.default.warn(`Manual trigger requires "collection" to be specified in the payload`);
                        throw new exceptions.ForbiddenException();
                    }
                    if (enabledCollections.length === 0) {
                        logger_1.default.warn(`There is no collections configured for this manual trigger`);
                        throw new exceptions.ForbiddenException();
                    }
                    if (!enabledCollections.includes(targetCollection)) {
                        logger_1.default.warn(`Specified collection must be one of: ${enabledCollections.join(', ')}.`);
                        throw new exceptions.ForbiddenException();
                    }
                    if (flow.options.async) {
                        this.executeFlow(flow, data, context);
                    }
                    else {
                        return this.executeFlow(flow, data, context);
                    }
                };
                // Default return to $last for manual
                flow.options.return = '$last';
                this.webhookFlowHandlers[`POST-${flow.id}`] = handler;
            }
        }
        this.isLoaded = true;
    }
    async unload() {
        for (const trigger of this.triggerHandlers) {
            trigger.events.forEach((event) => {
                switch (event.type) {
                    case 'filter':
                        emitter_1.default.offFilter(event.name, event.handler);
                        break;
                    case 'action':
                        emitter_1.default.offAction(event.name, event.handler);
                        break;
                    case 'schedule':
                        event.task.stop();
                        break;
                }
            });
        }
        this.triggerHandlers = [];
        this.operationFlowHandlers = {};
        this.webhookFlowHandlers = {};
        this.isLoaded = false;
    }
    async executeFlow(flow, data = null, context = {}) {
        var _a, _b, _c, _d, _e, _f, _g;
        const database = (_a = context.database) !== null && _a !== void 0 ? _a : (0, database_1.default)();
        const schema = (_b = context.schema) !== null && _b !== void 0 ? _b : (await (0, get_schema_1.getSchema)({ database }));
        const keyedData = {
            [TRIGGER_KEY]: data,
            [LAST_KEY]: data,
            [ACCOUNTABILITY_KEY]: (_c = context === null || context === void 0 ? void 0 : context.accountability) !== null && _c !== void 0 ? _c : null,
            [ENV_KEY]: (0, lodash_1.pick)(env_1.default, env_1.default.FLOWS_ENV_ALLOW_LIST ? (0, utils_1.toArray)(env_1.default.FLOWS_ENV_ALLOW_LIST) : []),
        };
        let nextOperation = flow.operation;
        let lastOperationStatus = 'unknown';
        const steps = [];
        while (nextOperation !== null) {
            const { successor, data, status, options } = await this.executeOperation(nextOperation, keyedData, context);
            keyedData[nextOperation.key] = data;
            keyedData[LAST_KEY] = data;
            lastOperationStatus = status;
            steps.push({ operation: nextOperation.id, key: nextOperation.key, status, options });
            nextOperation = successor;
        }
        if (flow.accountability !== null) {
            const activityService = new activity_1.ActivityService({
                knex: database,
                schema: schema,
            });
            const accountability = context === null || context === void 0 ? void 0 : context.accountability;
            const activity = await activityService.createOne({
                action: types_1.Action.RUN,
                user: (_d = accountability === null || accountability === void 0 ? void 0 : accountability.user) !== null && _d !== void 0 ? _d : null,
                collection: 'directus_flows',
                ip: (_e = accountability === null || accountability === void 0 ? void 0 : accountability.ip) !== null && _e !== void 0 ? _e : null,
                user_agent: (_f = accountability === null || accountability === void 0 ? void 0 : accountability.userAgent) !== null && _f !== void 0 ? _f : null,
                origin: (_g = accountability === null || accountability === void 0 ? void 0 : accountability.origin) !== null && _g !== void 0 ? _g : null,
                item: flow.id,
            });
            if (flow.accountability === 'all') {
                const revisionsService = new revisions_1.RevisionsService({
                    knex: database,
                    schema: schema,
                });
                await revisionsService.createOne({
                    activity: activity,
                    collection: 'directus_flows',
                    item: flow.id,
                    data: {
                        steps: steps,
                        data: redactLogs((0, lodash_1.omit)(keyedData, '$accountability.permissions')), // Permissions is a ton of data, and is just a copy of what's in the directus_permissions table
                    },
                });
            }
        }
        if (flow.trigger === 'event' && flow.options.type === 'filter' && lastOperationStatus === 'reject') {
            throw keyedData[LAST_KEY];
        }
        if (flow.options.return === '$all') {
            return keyedData;
        }
        else if (flow.options.return) {
            return (0, micromustache_1.get)(keyedData, flow.options.return);
        }
        return undefined;
    }
    async executeOperation(operation, keyedData, context = {}) {
        if (!(operation.type in this.operations)) {
            logger_1.default.warn(`Couldn't find operation ${operation.type}`);
            return { successor: null, status: 'unknown', data: null, options: null };
        }
        const handler = this.operations[operation.type];
        const options = (0, utils_1.applyOptionsData)(operation.options, keyedData);
        try {
            let result = await handler(options, {
                services,
                exceptions: { ...exceptions, ...sharedExceptions },
                env: env_1.default,
                database: (0, database_1.default)(),
                logger: logger_1.default,
                getSchema: get_schema_1.getSchema,
                data: keyedData,
                accountability: null,
                ...context,
            });
            // Validate that the operations result is serializable and thus catching the error inside the flow execution
            JSON.stringify(result !== null && result !== void 0 ? result : null);
            // JSON structures don't allow for undefined values, so we need to replace them with null
            // Otherwise the applyOptionsData function will not work correctly on the next operation
            if (typeof result === 'object' && result !== null) {
                result = (0, map_values_deep_1.mapValuesDeep)(result, (_, value) => (value === undefined ? null : value));
            }
            return { successor: operation.resolve, status: 'resolve', data: result !== null && result !== void 0 ? result : null, options };
        }
        catch (error) {
            let data;
            if (error instanceof Error) {
                // If the error is instance of Error, use the message of it as the error data
                data = { message: error.message };
            }
            else if (typeof error === 'string') {
                // If the error is a JSON string, parse it and use that as the error data
                data = (0, utils_1.isValidJSON)(error) ? (0, utils_1.parseJSON)(error) : error;
            }
            else {
                // If error is plain object, use this as the error data and otherwise fallback to null
                data = error !== null && error !== void 0 ? error : null;
            }
            return {
                successor: operation.reject,
                status: 'reject',
                data,
                options,
            };
        }
    }
}
