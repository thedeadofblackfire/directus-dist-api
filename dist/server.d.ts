/// <reference types="node" resolution-mode="require"/>
import * as http from 'http';
export declare function createServer(): Promise<http.Server>;
export declare function startServer(): Promise<void>;
