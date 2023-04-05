import type { Field, Relation } from '@directus/types';
import type { Collection } from '../types/index.js';
/**
 * Pick certain database vendor specific collection properties that should be compared when performing diff
 *
 * @param collection collection to sanitize
 * @returns sanitized collection
 */
export declare function sanitizeCollection(collection: Collection | undefined): Partial<Collection> | undefined;
/**
 * Pick certain database vendor specific field properties that should be compared when performing diff
 *
 * @param field field to sanitize
 * @param sanitizeAllSchema Whether or not the whole field schema should be sanitized. Mainly used to prevent modifying autoincrement fields
 * @returns sanitized field
 */
export declare function sanitizeField(field: Field | undefined, sanitizeAllSchema?: boolean): Partial<Field> | undefined;
/**
 * Pick certain database vendor specific relation properties that should be compared when performing diff
 *
 * @param relation relation to sanitize
 * @returns sanitized relation
 */
export declare function sanitizeRelation(relation: Relation | undefined): Partial<Relation> | undefined;
