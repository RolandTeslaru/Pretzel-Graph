import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { WorkbenchSDK } from "../../sdk";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id

export const nodePolymorphismReducers = {
    resolveGroup: (s, nodeId, triggerPort, resolvedVariant) => {
        console.log("Resolving polymorphic group", { nodeId, triggerPort, resolvedVariant })
        const node = s.data.nodes[nodeId];

        if(!Port.isPolymorphic(triggerPort) || !triggerPort.polymorphicGroupId)
            throw new Error(`Port ${triggerPort.id} is not polymorphic or does not have a polymorphicGroupId`);

        const polymorphicGroupId = triggerPort.polymorphicGroupId;

        const inputs = node.inputs.filter(i => Port.isPolymorphic(i) && i.polymorphicGroupId === polymorphicGroupId)
        const outputs = node.outputs.filter(o => Port.isPolymorphic(o) && o.polymorphicGroupId === polymorphicGroupId)

        inputs.forEach(i => {
            if(!Port.isUnresolvedLike(i.variant))
                return
            if (i.variant === "UnresolvedList") {
                (i as any).variant = Port.LIST_PROMOTION_MAP[resolvedVariant] ?? resolvedVariant;
            } else if (i.variant === "UnresolvedScalar") {
                (i as any).variant = Port.LIST_DEMOTION_MAP[resolvedVariant] ?? resolvedVariant;
            } else {
                (i as any).variant = resolvedVariant; // Normal Unresolved type
            }
        })

        outputs.forEach(o => {
            if(!Port.isUnresolvedLike(o.variant))
                return

            if (o.variant === "UnresolvedList") {
                (o as any).variant = Port.LIST_PROMOTION_MAP[resolvedVariant] ?? resolvedVariant;
            } else if (o.variant === "UnresolvedScalar") {
                (o as any).variant = Port.LIST_DEMOTION_MAP[resolvedVariant] ?? resolvedVariant;
            } else {
                (o as any).variant = resolvedVariant;
            }
        })
    },
    unresolveGroup: (s, nodeId, polymorphicGroupId) => {
        const node = s.data.nodes[nodeId];

        const inputs = node.inputs.filter(i => Foundations.Port.isPolymorphic(i) && i.polymorphicGroupId === polymorphicGroupId) as Foundations.Port.Variants.UnresolvedLike[];
        const outputs = node.outputs.filter(o => Foundations.Port.isPolymorphic(o) && o.polymorphicGroupId === polymorphicGroupId) as Foundations.Port.Variants.UnresolvedLike[];

        inputs.forEach(input => {
            input.variant = input.originalVariant;
        })

        outputs.forEach(output => {
            output.variant = output.originalVariant;
        })
    },
} satisfies NodePolymorphismReducers

export interface NodePolymorphismReducers {
    resolveGroup   : (s: S, nodeId: NodeId, triggerPort: Foundations.Port.Input | Foundations.Port.Output, resolvedVariant: Foundations.Port.Variant) => void
    unresolveGroup : (s: S, nodeId: NodeId, polymorphicGroupId: string) => void
}
