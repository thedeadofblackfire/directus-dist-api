"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapValuesDeep = void 0;
function mapValuesDeep(obj, fn) {
    return recurse(obj);
    function recurse(obj, prefix = '') {
        if (Array.isArray(obj)) {
            return obj.map((value, index) => {
                if (typeof value === 'object' && value !== null) {
                    return recurse(value, prefix + `[${index}]`);
                }
                else {
                    return fn(prefix + `[${index}]`, value);
                }
            });
        }
        else {
            return Object.fromEntries(Object.entries(obj).map(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    return [key, recurse(value, prefix + (prefix ? '.' : '') + key)];
                }
                else {
                    return [key, fn(prefix + (prefix ? '.' : '') + key, value)];
                }
            }));
        }
    }
}
exports.mapValuesDeep = mapValuesDeep;
