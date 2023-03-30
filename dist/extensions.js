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
exports.getExtensionManager = void 0;
const constants_1 = require("@directus/shared/constants");
const sharedExceptions = __importStar(require("@directus/shared/exceptions"));
const utils_1 = require("@directus/shared/utils");
const node_1 = require("@directus/shared/utils/node");
const plugin_alias_1 = __importDefault(require("@rollup/plugin-alias"));
const plugin_virtual_1 = __importDefault(require("@rollup/plugin-virtual"));
const chokidar_1 = __importDefault(require("chokidar"));
const express_1 = __importStar(require("express"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const globby_1 = __importDefault(require("globby"));
const lodash_1 = require("lodash");
const node_cron_1 = require("node-cron");
const path_1 = __importDefault(require("path"));
const rollup_1 = require("rollup");
const database_1 = __importDefault(require("./database"));
const emitter_1 = __importStar(require("./emitter"));
const env_1 = __importDefault(require("./env"));
const exceptions = __importStar(require("./exceptions"));
const flows_1 = require("./flows");
const logger_1 = __importDefault(require("./logger"));
const services = __importStar(require("./services"));
const dynamic_import_1 = require("./utils/dynamic-import");
const get_module_default_1 = __importDefault(require("./utils/get-module-default"));
const get_schema_1 = require("./utils/get-schema");
const job_queue_1 = require("./utils/job-queue");
const url_1 = require("./utils/url");
let extensionManager;
function getExtensionManager() {
    if (extensionManager) {
        return extensionManager;
    }
    extensionManager = new ExtensionManager();
    return extensionManager;
}
exports.getExtensionManager = getExtensionManager;
const defaultOptions = {
    schedule: true,
    watch: env_1.default['EXTENSIONS_AUTO_RELOAD'] && env_1.default['NODE_ENV'] !== 'development',
};
class ExtensionManager {
    isLoaded = false;
    options;
    extensions = [];
    appExtensions = null;
    apiExtensions = [];
    apiEmitter;
    hookEvents = [];
    endpointRouter;
    hookEmbedsHead = [];
    hookEmbedsBody = [];
    reloadQueue;
    watcher = null;
    constructor() {
        this.options = defaultOptions;
        this.apiEmitter = new emitter_1.Emitter();
        this.endpointRouter = (0, express_1.Router)();
        this.reloadQueue = new job_queue_1.JobQueue();
    }
    async initialize(options = {}) {
        const prevOptions = this.options;
        this.options = {
            ...defaultOptions,
            ...options,
        };
        if (!prevOptions.watch && this.options.watch) {
            this.initializeWatcher();
        }
        else if (prevOptions.watch && !this.options.watch) {
            await this.closeWatcher();
        }
        if (!this.isLoaded) {
            await this.load();
            const loadedExtensions = this.getExtensionsList();
            if (loadedExtensions.length > 0) {
                logger_1.default.info(`Loaded extensions: ${loadedExtensions.map((ext) => ext.name).join(', ')}`);
            }
        }
        if (!prevOptions.watch && this.options.watch) {
            this.updateWatchedExtensions(this.extensions);
        }
    }
    reload() {
        this.reloadQueue.enqueue(async () => {
            if (this.isLoaded) {
                logger_1.default.info('Reloading extensions');
                const prevExtensions = (0, lodash_1.clone)(this.extensions);
                await this.unload();
                await this.load();
                const added = this.extensions.filter((extension) => !prevExtensions.some((prevExtension) => extension.path === prevExtension.path));
                const removed = prevExtensions.filter((prevExtension) => !this.extensions.some((extension) => prevExtension.path === extension.path));
                this.updateWatchedExtensions(added, removed);
                const addedExtensions = added.map((extension) => extension.name);
                const removedExtensions = removed.map((extension) => extension.name);
                if (addedExtensions.length > 0) {
                    logger_1.default.info(`Added extensions: ${addedExtensions.join(', ')}`);
                }
                if (removedExtensions.length > 0) {
                    logger_1.default.info(`Removed extensions: ${removedExtensions.join(', ')}`);
                }
            }
            else {
                logger_1.default.warn('Extensions have to be loaded before they can be reloaded');
            }
        });
    }
    getExtensionsList(type) {
        if (type === undefined) {
            return this.extensions.map(mapInfo);
        }
        else {
            return this.extensions.map(mapInfo).filter((extension) => extension.type === type);
        }
        function mapInfo(extension) {
            const extensionInfo = {
                name: extension.name,
                type: extension.type,
                local: extension.local,
                entries: [],
            };
            if (extension.host)
                extensionInfo.host = extension.host;
            if (extension.version)
                extensionInfo.version = extension.version;
            if (extension.type === 'bundle') {
                const bundleExtensionInfo = {
                    name: extensionInfo.name,
                    type: 'bundle',
                    local: extensionInfo.local,
                    entries: extension.entries.map((entry) => ({
                        name: entry.name,
                        type: entry.type,
                    })),
                };
                return bundleExtensionInfo;
            }
            else {
                return extensionInfo;
            }
        }
    }
    getExtension(name) {
        return this.extensions.find((extension) => extension.name === name);
    }
    getAppExtensions() {
        return this.appExtensions;
    }
    getEndpointRouter() {
        return this.endpointRouter;
    }
    getEmbeds() {
        return {
            head: wrapEmbeds('Custom Embed Head', this.hookEmbedsHead),
            body: wrapEmbeds('Custom Embed Body', this.hookEmbedsBody),
        };
        function wrapEmbeds(label, content) {
            if (content.length === 0)
                return '';
            return `<!-- Start ${label} -->\n${content.join('\n')}\n<!-- End ${label} -->`;
        }
    }
    async load() {
        try {
            await (0, node_1.ensureExtensionDirs)(env_1.default['EXTENSIONS_PATH'], constants_1.NESTED_EXTENSION_TYPES);
            this.extensions = await this.getExtensions();
        }
        catch (err) {
            logger_1.default.warn(`Couldn't load extensions`);
            logger_1.default.warn(err);
        }
        await this.registerHooks();
        await this.registerEndpoints();
        await this.registerOperations();
        await this.registerBundles();
        if (env_1.default['SERVE_APP']) {
            this.appExtensions = await this.generateExtensionBundle();
        }
        this.isLoaded = true;
    }
    async unload() {
        this.unregisterApiExtensions();
        this.apiEmitter.offAll();
        if (env_1.default['SERVE_APP']) {
            this.appExtensions = null;
        }
        this.isLoaded = false;
    }
    initializeWatcher() {
        if (!this.watcher) {
            logger_1.default.info('Watching extensions for changes...');
            const localExtensionPaths = constants_1.NESTED_EXTENSION_TYPES.flatMap((type) => {
                const typeDir = path_1.default.posix.join((0, node_1.pathToRelativeUrl)(env_1.default['EXTENSIONS_PATH']), (0, utils_1.pluralize)(type));
                if ((0, utils_1.isIn)(type, constants_1.HYBRID_EXTENSION_TYPES)) {
                    return [path_1.default.posix.join(typeDir, '*', 'app.js'), path_1.default.posix.join(typeDir, '*', 'api.js')];
                }
                else {
                    return path_1.default.posix.join(typeDir, '*', 'index.js');
                }
            });
            this.watcher = chokidar_1.default.watch([path_1.default.resolve('package.json'), ...localExtensionPaths], {
                ignoreInitial: true,
            });
            this.watcher
                .on('add', () => this.reload())
                .on('change', () => this.reload())
                .on('unlink', () => this.reload());
        }
    }
    async closeWatcher() {
        if (this.watcher) {
            await this.watcher.close();
        }
    }
    updateWatchedExtensions(added, removed = []) {
        if (this.watcher) {
            const toPackageExtensionPaths = (extensions) => extensions
                .filter((extension) => !extension.local)
                .flatMap((extension) => (0, utils_1.isTypeIn)(extension, constants_1.HYBRID_EXTENSION_TYPES) || extension.type === 'bundle'
                ? [
                    path_1.default.resolve(extension.path, extension.entrypoint.app),
                    path_1.default.resolve(extension.path, extension.entrypoint.api),
                ]
                : path_1.default.resolve(extension.path, extension.entrypoint));
            const addedPackageExtensionPaths = toPackageExtensionPaths(added);
            const removedPackageExtensionPaths = toPackageExtensionPaths(removed);
            this.watcher.add(addedPackageExtensionPaths);
            this.watcher.unwatch(removedPackageExtensionPaths);
        }
    }
    async getExtensions() {
        const packageExtensions = await (0, node_1.getPackageExtensions)(env_1.default['PACKAGE_FILE_LOCATION']);
        const localPackageExtensions = await (0, node_1.resolvePackageExtensions)(env_1.default['EXTENSIONS_PATH']);
        const localExtensions = await (0, node_1.getLocalExtensions)(env_1.default['EXTENSIONS_PATH']);
        return [...packageExtensions, ...localPackageExtensions, ...localExtensions].filter((extension) => env_1.default['SERVE_APP'] || constants_1.APP_EXTENSION_TYPES.includes(extension.type) === false);
    }
    async generateExtensionBundle() {
        const sharedDepsMapping = await this.getSharedDepsMapping(constants_1.APP_SHARED_DEPS);
        const internalImports = Object.entries(sharedDepsMapping).map(([name, path]) => ({
            find: name,
            replacement: path,
        }));
        const entrypoint = (0, node_1.generateExtensionsEntrypoint)(this.extensions);
        try {
            const bundle = await (0, rollup_1.rollup)({
                input: 'entry',
                external: Object.values(sharedDepsMapping),
                makeAbsoluteExternalsRelative: false,
                plugins: [(0, plugin_virtual_1.default)({ entry: entrypoint }), (0, plugin_alias_1.default)({ entries: internalImports })],
            });
            const { output } = await bundle.generate({ format: 'es', compact: true });
            await bundle.close();
            return output[0].code;
        }
        catch (error) {
            logger_1.default.warn(`Couldn't bundle App extensions`);
            logger_1.default.warn(error);
        }
        return null;
    }
    async getSharedDepsMapping(deps) {
        const appDir = await fs_extra_1.default.readdir(path_1.default.join((0, node_1.resolvePackage)('@directus/app', __dirname), 'dist', 'assets'));
        const depsMapping = {};
        for (const dep of deps) {
            const depRegex = new RegExp(`${(0, lodash_1.escapeRegExp)(dep.replace(/\//g, '_'))}\\.[0-9a-f]{8}\\.entry\\.js`);
            const depName = appDir.find((file) => depRegex.test(file));
            if (depName) {
                const depUrl = new url_1.Url(env_1.default['PUBLIC_URL']).addPath('admin', 'assets', depName);
                depsMapping[dep] = depUrl.toString({ rootRelative: true });
            }
            else {
                logger_1.default.warn(`Couldn't find shared extension dependency "${dep}"`);
            }
        }
        return depsMapping;
    }
    async registerHooks() {
        const hooks = this.extensions.filter((extension) => extension.type === 'hook');
        for (const hook of hooks) {
            try {
                const hookPath = path_1.default.resolve(hook.path, hook.entrypoint);
                const hookInstance = await (0, dynamic_import_1.dynamicImport)(hookPath);
                const config = (0, get_module_default_1.default)(hookInstance);
                this.registerHook(config);
                this.apiExtensions.push({ path: hookPath });
            }
            catch (error) {
                logger_1.default.warn(`Couldn't register hook "${hook.name}"`);
                logger_1.default.warn(error);
            }
        }
    }
    async registerEndpoints() {
        const endpoints = this.extensions.filter((extension) => extension.type === 'endpoint');
        for (const endpoint of endpoints) {
            try {
                const endpointPath = path_1.default.resolve(endpoint.path, endpoint.entrypoint);
                const endpointInstance = require(endpointPath);
                const config = (0, get_module_default_1.default)(endpointInstance);
                this.registerEndpoint(config, endpoint.name);
                this.apiExtensions.push({ path: endpointPath });
            }
            catch (error) {
                logger_1.default.warn(`Couldn't register endpoint "${endpoint.name}"`);
                logger_1.default.warn(error);
            }
        }
    }
    async registerOperations() {
        const internalPaths = await (0, globby_1.default)(path_1.default.posix.join((0, node_1.pathToRelativeUrl)(__dirname), 'operations/*/index.(js|ts)'));
        const internalOperations = internalPaths.map((internalPath) => {
            const dirs = internalPath.split(path_1.default.sep);
            return {
                name: dirs[dirs.length - 2],
                path: dirs.slice(0, -1).join(path_1.default.sep),
                entrypoint: { api: dirs[dirs.length - 1] },
            };
        });
        const operations = this.extensions.filter((extension) => extension.type === 'operation');
        for (const operation of [...internalOperations, ...operations]) {
            try {
                const operationPath = path_1.default.resolve(operation.path, operation.entrypoint.api);
                const operationInstance = require(operationPath);
                const config = (0, get_module_default_1.default)(operationInstance);
                this.registerOperation(config);
                this.apiExtensions.push({ path: operationPath });
            }
            catch (error) {
                logger_1.default.warn(`Couldn't register operation "${operation.name}"`);
                logger_1.default.warn(error);
            }
        }
    }
    async registerBundles() {
        const bundles = this.extensions.filter((extension) => extension.type === 'bundle');
        for (const bundle of bundles) {
            try {
                const bundlePath = path_1.default.resolve(bundle.path, bundle.entrypoint.api);
                const bundleInstances = require(bundlePath);
                const configs = (0, get_module_default_1.default)(bundleInstances);
                for (const { config } of configs.hooks) {
                    this.registerHook(config);
                }
                for (const { config, name } of configs.endpoints) {
                    this.registerEndpoint(config, name);
                }
                for (const { config } of configs.operations) {
                    this.registerOperation(config);
                }
                this.apiExtensions.push({ path: bundlePath });
            }
            catch (error) {
                logger_1.default.warn(`Couldn't register bundle "${bundle.name}"`);
                logger_1.default.warn(error);
            }
        }
    }
    registerHook(register) {
        const registerFunctions = {
            filter: (event, handler) => {
                emitter_1.default.onFilter(event, handler);
                this.hookEvents.push({
                    type: 'filter',
                    name: event,
                    handler,
                });
            },
            action: (event, handler) => {
                emitter_1.default.onAction(event, handler);
                this.hookEvents.push({
                    type: 'action',
                    name: event,
                    handler,
                });
            },
            init: (event, handler) => {
                emitter_1.default.onInit(event, handler);
                this.hookEvents.push({
                    type: 'init',
                    name: event,
                    handler,
                });
            },
            schedule: (cron, handler) => {
                if ((0, node_cron_1.validate)(cron)) {
                    const task = (0, node_cron_1.schedule)(cron, async () => {
                        if (this.options.schedule) {
                            try {
                                await handler();
                            }
                            catch (error) {
                                logger_1.default.error(error);
                            }
                        }
                    });
                    this.hookEvents.push({
                        type: 'schedule',
                        task,
                    });
                }
                else {
                    logger_1.default.warn(`Couldn't register cron hook. Provided cron is invalid: ${cron}`);
                }
            },
            embed: (position, code) => {
                const content = typeof code === 'function' ? code() : code;
                if (content.trim().length === 0) {
                    logger_1.default.warn(`Couldn't register embed hook. Provided code is empty!`);
                    return;
                }
                if (position === 'head') {
                    this.hookEmbedsHead.push(content);
                }
                if (position === 'body') {
                    this.hookEmbedsBody.push(content);
                }
            },
        };
        register(registerFunctions, {
            services,
            exceptions: { ...exceptions, ...sharedExceptions },
            env: env_1.default,
            database: (0, database_1.default)(),
            emitter: this.apiEmitter,
            logger: logger_1.default,
            getSchema: get_schema_1.getSchema,
        });
    }
    registerEndpoint(config, name) {
        const register = typeof config === 'function' ? config : config.handler;
        const routeName = typeof config === 'function' ? name : config.id;
        const scopedRouter = express_1.default.Router();
        this.endpointRouter.use(`/${routeName}`, scopedRouter);
        register(scopedRouter, {
            services,
            exceptions: { ...exceptions, ...sharedExceptions },
            env: env_1.default,
            database: (0, database_1.default)(),
            emitter: this.apiEmitter,
            logger: logger_1.default,
            getSchema: get_schema_1.getSchema,
        });
    }
    registerOperation(config) {
        const flowManager = (0, flows_1.getFlowManager)();
        flowManager.addOperation(config.id, config.handler);
    }
    unregisterApiExtensions() {
        for (const event of this.hookEvents) {
            switch (event.type) {
                case 'filter':
                    emitter_1.default.offFilter(event.name, event.handler);
                    break;
                case 'action':
                    emitter_1.default.offAction(event.name, event.handler);
                    break;
                case 'init':
                    emitter_1.default.offInit(event.name, event.handler);
                    break;
                case 'schedule':
                    event.task.stop();
                    break;
            }
        }
        this.hookEvents = [];
        this.endpointRouter.stack = [];
        const flowManager = (0, flows_1.getFlowManager)();
        flowManager.clearOperations();
        for (const apiExtension of this.apiExtensions) {
            delete require.cache[require.resolve(apiExtension.path)];
        }
        this.apiExtensions = [];
    }
}
