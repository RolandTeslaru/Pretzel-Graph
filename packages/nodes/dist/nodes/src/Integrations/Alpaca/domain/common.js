"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalDate = exports.bounded = exports.required = exports.plain = exports.iso = void 0;
const iso = (value) => {
    if (value === undefined || value === null)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};
exports.iso = iso;
/** Converts generated SDK models into graph-safe JSON while preserving unknown activity fields. */
const plain = (value) => {
    if (value === undefined || value === null)
        return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        return value;
    if (value instanceof Date)
        return value.toISOString();
    if (value instanceof Set)
        return [...value].map(exports.plain);
    if (Array.isArray(value))
        return value.map(exports.plain);
    if (typeof value === "object")
        return Object.fromEntries(Object.entries(value)
            .filter(([, child]) => child !== undefined)
            .map(([key, child]) => [key, (0, exports.plain)(child)]));
    return String(value);
};
exports.plain = plain;
const required = (value, name) => {
    const result = value.trim();
    if (!result)
        throw new Error(`Alpaca: '${name}' is required.`);
    return result;
};
exports.required = required;
const bounded = (value, fallback, maximum) => Math.min(Math.max(Math.trunc(value ?? fallback), 1), maximum);
exports.bounded = bounded;
const optionalDate = (value, name) => {
    if (!value?.trim())
        return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new Error(`Alpaca: '${name}' must be an ISO date or datetime.`);
    return date;
};
exports.optionalDate = optionalDate;
