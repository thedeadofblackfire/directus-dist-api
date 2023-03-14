"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffKind = void 0;
/**
 * Indicates the kind of change based on comparisons by deep-diff package
 */
exports.DiffKind = {
    /** indicates a newly added property/element */
    NEW: 'N',
    /** indicates a property/element was deleted */
    DELETE: 'D',
    /** indicates a property/element was edited */
    EDIT: 'E',
    /** indicates a change occurred within an array */
    ARRAY: 'A',
};
