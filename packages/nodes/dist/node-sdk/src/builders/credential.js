"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineCredential = defineCredential;
function defineCredential(config) {
    return {
        id: config.id,
        displayName: config.displayName,
        fields: config.fields,
        icon: config.icon,
        optional: config.optional,
    };
}
