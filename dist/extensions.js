import { APP_EXTENSION_TYPES, APP_SHARED_DEPS, HYBRID_EXTENSION_TYPES, NESTED_EXTENSION_TYPES, } from '@directus/constants';
import * as sharedExceptions from '@directus/exceptions';
import { isIn, isTypeIn, pluralize } from '@directus/utils';
import { ensureExtensionDirs, generateExtensionsEntrypoint, getLocalExtensions, getPackageExtensions, pathToRelativeUrl, resolvePackage, resolvePackageExtensions, } from '@directus/utils/node';
import aliasDefault from '@rollup/plugin-alias';
import nodeResolveDefault from '@rollup/plugin-node-resolve';
import virtualDefault from '@rollup/plugin-virtual';
import chokidar from 'chokidar';
import express, { Router } from 'express';
import globby from 'globby';
import { clone, escapeRegExp } from 'lodash-es';
import { schedule, validate } from 'node-cron';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { rollup } from 'rollup';
import getDatabase from './database/index.js';
import emitter, { Emitter } from './emitter.js';
import env from './env.js';
import * as exceptions from './exceptions/index.js';
import { getFlowManager } from './flows.js';
import logger from './logger.js';
import * as services from './services/index.js';
import getModuleDefault from './utils/get-module-default.js';
import { getSchema } from './utils/get-schema.js';
import { JobQueue } from './utils/job-queue.js';
import { Url } from './utils/url.js';
// Workaround for https://github.com/rollup/plugins/issues/1329
const virtual = virtualDefault;
const alias = aliasDefault;
const nodeResolve = nodeResolveDefault;
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
let extensionManager;
export function getExtensionManager() {
    if (extensionManager) {
        return extensionManager;
    }
    extensionManager = new ExtensionManager();
    return extensionManager;
}
const defaultOptions = {
    schedule: true,
    watch: env['EXTENSIONS_AUTO_RELOAD'] && env['NODE_ENV'] !== 'development',
};
class ExtensionManager {
    isLoaded = false;
    options;
    extensions = [];
    appExtensions = null;
    appExtensionChunks;
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
        this.apiEmitter = new Emitter();
        this.endpointRouter = Router();
        this.reloadQueue = new JobQueue();
        this.appExtensionChunks = new Map();
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
                logger.info(`Loaded extensions: ${loadedExtensions.map((ext) => ext.name).join(', ')}`);
            }
        }
        if (!prevOptions.watch && this.options.watch) {
            this.updateWatchedExtensions(this.extensions);
        }
    }
    reload() {
        this.reloadQueue.enqueue(async () => {
            if (this.isLoaded) {
                logger.info('Reloading extensions');
                const prevExtensions = clone(this.extensions);
                await this.unload();
                await this.load();
                const added = this.extensions.filter((extension) => !prevExtensions.some((prevExtension) => extension.path === prevExtension.path));
                const removed = prevExtensions.filter((prevExtension) => !this.extensions.some((extension) => prevExtension.path === extension.path));
                this.updateWatchedExtensions(added, removed);
                const addedExtensions = added.map((extension) => extension.name);
                const removedExtensions = removed.map((extension) => extension.name);
                if (addedExtensions.length > 0) {
                    logger.info(`Added extensions: ${addedExtensions.join(', ')}`);
                }
                if (removedExtensions.length > 0) {
                    logger.info(`Removed extensions: ${removedExtensions.join(', ')}`);
                }
            }
            else {
                logger.warn('Extensions have to be loaded before they can be reloaded');
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
    getAppExtensionChunk(name) {
        return this.appExtensionChunks.get(name) ?? null;
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
            await ensureExtensionDirs(env['EXTENSIONS_PATH'], NESTED_EXTENSION_TYPES);
            this.extensions = await this.getExtensions();
        }
        catch (err) {
            logger.warn(`Couldn't load extensions`);
            logger.warn(err);
        }
        await this.registerHooks();
        await this.registerEndpoints();
        await this.registerOperations();
        await this.registerBundles();
        if (env['SERVE_APP']) {
            this.appExtensions = await this.generateExtensionBundle();
        }
        this.isLoaded = true;
    }
    async unload() {
        this.unregisterApiExtensions();
        this.apiEmitter.offAll();
        if (env['SERVE_APP']) {
            this.appExtensions = null;
        }
        this.isLoaded = false;
    }
    initializeWatcher() {
        if (!this.watcher) {
            logger.info('Watching extensions for changes...');
            const localExtensionPaths = NESTED_EXTENSION_TYPES.flatMap((type) => {
                const typeDir = path.posix.join(pathToRelativeUrl(env['EXTENSIONS_PATH']), pluralize(type));
                if (isIn(type, HYBRID_EXTENSION_TYPES)) {
                    return [path.posix.join(typeDir, '*', 'app.js'), path.posix.join(typeDir, '*', 'api.js')];
                }
                else {
                    return path.posix.join(typeDir, '*', 'index.js');
                }
            });
            this.watcher = chokidar.watch([path.resolve('package.json'), ...localExtensionPaths], {
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
                .flatMap((extension) => isTypeIn(extension, HYBRID_EXTENSION_TYPES) || extension.type === 'bundle'
                ? [
                    path.resolve(extension.path, extension.entrypoint.app),
                    path.resolve(extension.path, extension.entrypoint.api),
                ]
                : path.resolve(extension.path, extension.entrypoint));
            const addedPackageExtensionPaths = toPackageExtensionPaths(added);
            const removedPackageExtensionPaths = toPackageExtensionPaths(removed);
            this.watcher.add(addedPackageExtensionPaths);
            this.watcher.unwatch(removedPackageExtensionPaths);
        }
    }
    async getExtensions() {
        const packageExtensions = await getPackageExtensions(env['PACKAGE_FILE_LOCATION']);
        const localPackageExtensions = await resolvePackageExtensions(env['EXTENSIONS_PATH']);
        const localExtensions = await getLocalExtensions(env['EXTENSIONS_PATH']);
        return [...packageExtensions, ...localPackageExtensions, ...localExtensions].filter((extension) => env['SERVE_APP'] || APP_EXTENSION_TYPES.includes(extension.type) === false);
    }
    async generateExtensionBundle() {
        const sharedDepsMapping = await this.getSharedDepsMapping(APP_SHARED_DEPS);
        const internalImports = Object.entries(sharedDepsMapping).map(([name, path]) => ({
            find: name,
            replacement: path,
        }));
        const entrypoint = generateExtensionsEntrypoint(this.extensions);
        try {
            const bundle = await rollup({
                input: 'entry',
                external: Object.values(sharedDepsMapping),
                makeAbsoluteExternalsRelative: false,
                plugins: [virtual({ entry: entrypoint }), alias({ entries: internalImports }), nodeResolve({ browser: true })],
            });
            const { output } = await bundle.generate({ format: 'es', compact: true });
            for (const out of output) {
                if (out.type === 'chunk') {
                    this.appExtensionChunks.set(out.fileName, out.code);
                }
            }
            await bundle.close();
            return output[0].code;
        }
        catch (error) {
            logger.warn(`Couldn't bundle App extensions`);
            logger.warn(error);
        }
        return null;
    }
    async getSharedDepsMapping(deps) {
        const appDir = await readdir(path.join(resolvePackage('@directus/app', __dirname), 'dist', 'assets'));
        const depsMapping = {};
        for (const dep of deps) {
            const depRegex = new RegExp(`${escapeRegExp(dep.replace(/\//g, '_'))}\\.[0-9a-f]{8}\\.entry\\.js`);
            const depName = appDir.find((file) => depRegex.test(file));
            if (depName) {
                const depUrl = new Url(env['PUBLIC_URL']).addPath('admin', 'assets', depName);
                depsMapping[dep] = depUrl.toString({ rootRelative: true });
            }
            else {
                logger.warn(`Couldn't find shared extension dependency "${dep}"`);
            }
        }
        return depsMapping;
    }
    async registerHooks() {
        const hooks = this.extensions.filter((extension) => extension.type === 'hook');
        for (const hook of hooks) {
            try {
                const hookPath = path.resolve(hook.path, hook.entrypoint);
                const hookInstance = await import(`file://${hookPath}`);
                const config = getModuleDefault(hookInstance);
                this.registerHook(config);
                this.apiExtensions.push({ path: hookPath });
            }
            catch (error) {
                logger.warn(`Couldn't register hook "${hook.name}"`);
                logger.warn(error);
            }
        }
    }
    async registerEndpoints() {
        const endpoints = this.extensions.filter((extension) => extension.type === 'endpoint');
        for (const endpoint of endpoints) {
            try {
                const endpointPath = path.resolve(endpoint.path, endpoint.entrypoint);
                const endpointInstance = await import(`file://${endpointPath}`);
                const config = getModuleDefault(endpointInstance);
                this.registerEndpoint(config, endpoint.name);
                this.apiExtensions.push({ path: endpointPath });
            }
            catch (error) {
                logger.warn(`Couldn't register endpoint "${endpoint.name}"`);
                logger.warn(error);
            }
        }
    }
    async registerOperations() {
        const internalPaths = await globby(path.posix.join(pathToRelativeUrl(__dirname), 'operations/*/index.(js|ts)'));
        const internalOperations = internalPaths.map((internalPath) => {
            const dirs = internalPath.split(path.sep);
            return {
                name: dirs[dirs.length - 2],
                path: dirs.slice(0, -1).join(path.sep),
                entrypoint: { api: dirs[dirs.length - 1] },
            };
        });
        const operations = this.extensions.filter((extension) => extension.type === 'operation');
        for (const operation of [...internalOperations, ...operations]) {
            try {
                const operationPath = path.resolve(operation.path, operation.entrypoint.api);
                const operationInstance = await import(`file://${operationPath}`);
                const config = getModuleDefault(operationInstance);
                this.registerOperation(config);
                this.apiExtensions.push({ path: operationPath });
            }
            catch (error) {
                logger.warn(`Couldn't register operation "${operation.name}"`);
                logger.warn(error);
            }
        }
    }
    async registerBundles() {
        const bundles = this.extensions.filter((extension) => extension.type === 'bundle');
        for (const bundle of bundles) {
            try {
                const bundlePath = path.resolve(bundle.path, bundle.entrypoint.api);
                const bundleInstances = await import(`file://${bundlePath}`);
                const configs = getModuleDefault(bundleInstances);
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
                logger.warn(`Couldn't register bundle "${bundle.name}"`);
                logger.warn(error);
            }
        }
    }
    registerHook(register) {
        const registerFunctions = {
            filter: (event, handler) => {
                emitter.onFilter(event, handler);
                this.hookEvents.push({
                    type: 'filter',
                    name: event,
                    handler,
                });
            },
            action: (event, handler) => {
                emitter.onAction(event, handler);
                this.hookEvents.push({
                    type: 'action',
                    name: event,
                    handler,
                });
            },
            init: (event, handler) => {
                emitter.onInit(event, handler);
                this.hookEvents.push({
                    type: 'init',
                    name: event,
                    handler,
                });
            },
            schedule: (cron, handler) => {
                if (validate(cron)) {
                    const task = schedule(cron, async () => {
                        if (this.options.schedule) {
                            try {
                                await handler();
                            }
                            catch (error) {
                                logger.error(error);
                            }
                        }
                    });
                    this.hookEvents.push({
                        type: 'schedule',
                        task,
                    });
                }
                else {
                    logger.warn(`Couldn't register cron hook. Provided cron is invalid: ${cron}`);
                }
            },
            embed: (position, code) => {
                const content = typeof code === 'function' ? code() : code;
                if (content.trim().length === 0) {
                    logger.warn(`Couldn't register embed hook. Provided code is empty!`);
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
            env,
            database: getDatabase(),
            emitter: this.apiEmitter,
            logger,
            getSchema,
        });
    }
    registerEndpoint(config, name) {
        const register = typeof config === 'function' ? config : config.handler;
        const routeName = typeof config === 'function' ? name : config.id;
        const scopedRouter = express.Router();
        this.endpointRouter.use(`/${routeName}`, scopedRouter);
        register(scopedRouter, {
            services,
            exceptions: { ...exceptions, ...sharedExceptions },
            env,
            database: getDatabase(),
            emitter: this.apiEmitter,
            logger,
            getSchema,
        });
    }
    registerOperation(config) {
        const flowManager = getFlowManager();
        flowManager.addOperation(config.id, config.handler);
    }
    unregisterApiExtensions() {
        for (const event of this.hookEvents) {
            switch (event.type) {
                case 'filter':
                    emitter.offFilter(event.name, event.handler);
                    break;
                case 'action':
                    emitter.offAction(event.name, event.handler);
                    break;
                case 'init':
                    emitter.offInit(event.name, event.handler);
                    break;
                case 'schedule':
                    event.task.stop();
                    break;
            }
        }
        this.hookEvents = [];
        this.endpointRouter.stack = [];
        const flowManager = getFlowManager();
        flowManager.clearOperations();
        for (const apiExtension of this.apiExtensions) {
            delete require.cache[require.resolve(apiExtension.path)];
        }
        this.apiExtensions = [];
    }
}
