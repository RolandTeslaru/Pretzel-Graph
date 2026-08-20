"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uid = void 0;
exports.mapFieldValues = mapFieldValues;
exports.uid = {
    randomUUID: (length) => Math.random().toString(36).substring(2, 2 + length)
};
// Join a resolved blueprint's fields against a node's staticValues, falling back to each field's
// initialValue. Pass the derived blueprint's fields to include branch-contributed fields.
function mapFieldValues(fields, staticValues) {
    const resolved = {};
    for (const field of fields) {
        const fieldId = field.id;
        if (fieldId in staticValues)
            resolved[fieldId] = staticValues[fieldId];
        else
            resolved[fieldId] = field.initialValue;
    }
    return resolved;
}
