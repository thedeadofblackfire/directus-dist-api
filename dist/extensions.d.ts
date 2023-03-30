import type { Extension, ExtensionInfo, ExtensionType } from '@directus/shared/types';
import { Router } from 'express';
export declare function getExtensionManager(): ExtensionManager;
type Options = {
    schedule: boolean;
    watch: boolean;
};
declare class ExtensionManager {
    private isLoaded;
    private options;
    private extensions;
    private appExtensions;
    private apiExtensions;
    private apiEmitter;
    private hookEvents;
    private endpointRouter;
    private hookEmbedsHead;
    private hookEmbedsBody;
    private reloadQueue;
    private watcher;
    constructor();
    initialize(options?: Partial<Options>): Promise<void>;
    reload(): void;
    getExtensionsList(type?: ExtensionType): ExtensionInfo[];
    getExtension(name: string): Extension | undefined;
    getAppExtensions(): string | null;
    getEndpointRouter(): Router;
    getEmbeds(): {
        head: string;
        body: string;
    };
    private load;
    private unload;
    private initializeWatcher;
    private closeWatcher;
    private updateWatchedExtensions;
    private getExtensions;
    private generateExtensionBundle;
    private getSharedDepsMapping;
    private registerHooks;
    private registerEndpoints;
    private registerOperations;
    private registerBundles;
    private registerHook;
    private registerEndpoint;
    private registerOperation;
    private unregisterApiExtensions;
}
export {};
