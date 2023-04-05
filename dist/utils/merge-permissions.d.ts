/// <reference types="lodash" resolution-mode="require"/>
import type { Permission } from '@directus/types';
export declare function mergePermissions(strategy: 'and' | 'or', ...permissions: Permission[][]): Permission[];
export declare function mergePermission(strategy: 'and' | 'or', currentPerm: Permission, newPerm: Permission): import("lodash").Omit<{
    permissions: import("@directus/types").Filter | null;
    validation: import("@directus/types").Filter | null;
    fields: string[] | null;
    presets: Record<string, any> | null;
    id?: number;
    role: string | null;
    collection: string;
    action: import("@directus/types").PermissionsAction;
    system?: true;
}, "id" | "system">;
