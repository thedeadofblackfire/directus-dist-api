import { isNil } from 'lodash-es';
// Extract transforms from a preset
export function resolvePreset(input, file) {
    // Do the format conversion last
    return [extractResize(input), ...(input.transforms ?? []), extractToFormat(input, file)].filter((transform) => transform !== undefined);
}
function extractOptions(keys, numberKeys = [], booleanKeys = []) {
    return function (input) {
        return Object.entries(input).reduce((config, [key, value]) => keys.includes(key) && isNil(value) === false
            ? {
                ...config,
                [key]: numberKeys.includes(key)
                    ? +value
                    : booleanKeys.includes(key)
                        ? Boolean(value)
                        : value,
            }
            : config, {});
    };
}
// Extract format transform from a preset
function extractToFormat(input, file) {
    const options = extractOptions(['format', 'quality'], ['quality'])(input);
    return Object.keys(options).length > 0
        ? [
            'toFormat',
            options.format || file.type.split('/')[1],
            {
                quality: options.quality,
            },
        ]
        : undefined;
}
function extractResize(input) {
    const resizable = ['width', 'height'].some((key) => key in input);
    if (!resizable)
        return undefined;
    return [
        'resize',
        extractOptions(['width', 'height', 'fit', 'withoutEnlargement'], ['width', 'height'], ['withoutEnlargement'])(input),
    ];
}
/**
 * Try to extract a file format from an array of `Transformation`'s.
 */
export function maybeExtractFormat(transforms) {
    const toFormats = transforms.filter((t) => t[0] === 'toFormat');
    const lastToFormat = toFormats[toFormats.length - 1];
    return lastToFormat ? lastToFormat[1]?.toString() : undefined;
}
