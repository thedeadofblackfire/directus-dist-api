import { AliasMap } from './get-column-path';
/**
 * Extract the collection of an alias within an aliasMap
 * For example: 'ljnsv.name' -> 'authors'
 */
export declare function getCollectionFromAlias(alias: string, aliasMap: AliasMap): string | undefined;
