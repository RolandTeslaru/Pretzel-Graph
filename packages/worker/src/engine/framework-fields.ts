import type { Foundations } from "@pretzel-graph/shared/domain";

/**
 * Reads a node's framework-owned field values (execution strategies, tool mode).
 *
 * `InferFieldValues` becomes a union once a blueprint declares derivatives, and a union can't be
 * indexed by a dynamic key even though every arm carries these fields. The engine only ever reads
 * framework fields dynamically, so it goes through here rather than each site casting.
 */
export function frameworkFields(
    instance?: { fieldValues: unknown },
): Record<Foundations.Field.Id, Foundations.Field.Value> {
    return (instance?.fieldValues ?? {}) as Record<Foundations.Field.Id, Foundations.Field.Value>;
}
