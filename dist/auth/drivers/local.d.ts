import { Router } from 'express';
import type { User } from '../../types';
import { AuthDriver } from '../auth';
export declare class LocalAuthDriver extends AuthDriver {
    getUserID(payload: Record<string, any>): Promise<string>;
    verify(user: User, password?: string): Promise<void>;
    login(user: User, payload: Record<string, any>): Promise<void>;
}
export declare function createLocalAuthRouter(provider: string): Router;
