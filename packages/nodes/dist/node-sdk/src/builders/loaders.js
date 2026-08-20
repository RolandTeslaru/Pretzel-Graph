"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineLoaders = defineLoaders;
/**
 * Binds a blueprint type, then infers the concrete loaders map so each loader's
 * context (`fieldValues`, `credentials`) is typed against that blueprint.
 *
 * Curried because static members cannot reference a class type parameter, so the
 * blueprint must be supplied explicitly at the declaration site.
 *
 * @example
 * static loaders = defineLoaders<typeof Blueprint>()({
 *     tableSearch: async ({ fieldValues, searchQuery }) => { ... },
 * });
 */
function defineLoaders() {
    return (loaders) => loaders;
}
