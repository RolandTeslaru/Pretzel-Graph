import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { RuntimeNode } from "../node";

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
export function defineLoaders<T_Blueprint extends Blueprint>() {
    return <T extends Record<string, RuntimeNode.LoaderFn<T_Blueprint>>>(loaders: T): T => loaders;
}
