import { Foundations } from "./Foundations";
import { Port } from "./Foundations/Port";

type PolymorphicResolutions = Record<Port.PolymorphicGroupId, Port.Variant>;

function resolveVariant(unresolved: Port.Variant, resolved: Port.Variant): Port.Variant {
    if (unresolved === "UnresolvedList")   return Port.LIST_PROMOTION_MAP[resolved] ?? resolved;
    if (unresolved === "UnresolvedScalar") return Port.LIST_DEMOTION_MAP[resolved] ?? resolved;
    return resolved;
}

/**
 * Derive a slim node's live ports: base blueprint ports + user-added ports, with each
 * polymorphic group's variant replayed from `polymorphicResolutions`. Variadic slots are
 * already materialized in `added`, so no count expansion is needed here.
 */
export function resolvePorts<P extends Foundations.Port.Input | Foundations.Port.Output>(
    base: readonly P[],
    added: readonly P[] | undefined,
    resolutions: PolymorphicResolutions | undefined,
): P[] {
    const all = added && added.length > 0 ? [...base, ...added] : [...base];
    if (!resolutions) return all;

    return all.map(port => {
        const groupId = port.polymorphicGroupId;
        if (!groupId || !Port.isUnresolvedLike(port.variant))
            return port;

        const resolved = resolutions[groupId];
        if (!resolved)
            return port;

        return { ...port, variant: resolveVariant(port.variant, resolved) };
    });
}
