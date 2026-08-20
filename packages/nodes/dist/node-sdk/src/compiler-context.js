"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompilationContext = createCompilationContext;
exports.extendCompilePath = extendCompilePath;
function createCompilationContext(rootId) {
    return { compilePath: [rootId] };
}
function extendCompilePath(ctx, nextId) {
    return {
        compilePath: [...ctx.compilePath, nextId],
    };
}
