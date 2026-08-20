"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uid = void 0;
exports.isUUID = isUUID;
exports.uid = {
    randomUUID: (length) => Math.random().toString(36).substring(2, 2 + length)
};
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(value) {
    return UUID_REGEX.test(value);
}
