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

        node.polymorphicResolutions = node.polymorphicResolutions ?? {};
        node.polymorphicResolutions[polymorphicGroupId] = resolvedVariant;
        s.reducers.cache.resolvedShape.recreate(s, nodeId);
    },
    unresolveGroup: (s, nodeId, polymorphicGroupId) => {
        const node = s.data.nodes[nodeId];

        if(!node.polymorphicResolutions)
            return

        delete node.polymorphicResolutions[polymorphicGroupId]

        if(Object.values(node.polymorphicResolutions).length === 0)
            delete node.polymorphicResolutions

        s.reducers.cache.resolvedShape.recreate(s, nodeId);
    },
} satisfies NodePolymorphismReducers

export interface NodePolymorphismReducers {
    resolveGroup   : (s: S, nodeId: NodeId, triggerPort: Foundations.Port.Input | Foundations.Port.Output, resolvedVariant: Foundations.Port.Variant) => void
    unresolveGroup : (s: S, nodeId: NodeId, polymorphicGroupId: Foundations.Port.PolymorphicGroupId) => void
}
