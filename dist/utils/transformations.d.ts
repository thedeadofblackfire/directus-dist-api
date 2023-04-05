import type { File, Transformation, TransformationParams, TransformationPreset } from '../types/index.js';
export declare function resolvePreset(input: TransformationParams | TransformationPreset, file: File): Transformation[];
/**
 * Try to extract a file format from an array of `Transformation`'s.
 */
export declare function maybeExtractFormat(transforms: Transformation[]): string | undefined;
