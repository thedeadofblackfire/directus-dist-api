"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMilliseconds = void 0;
const ms_1 = __importDefault(require("ms"));
function getMilliseconds(value, fallback = undefined) {
    if ((typeof value !== 'string' && typeof value !== 'number') || value === '') {
        return fallback;
    }
    return (0, ms_1.default)(String(value)) ?? fallback;
}
exports.getMilliseconds = getMilliseconds;
