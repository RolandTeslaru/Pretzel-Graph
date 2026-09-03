import { Foundations } from "../../../../Foundations";
import { Workflow } from "../../../../Workflow";
import { Port } from "../../../../Foundations/Port";
import type { Document } from "../../index";

type NodeId = Workflow.Node.Id

export const nodePolymorphismReducers: NodePolymorphismReducers = {
    resolveGroup: (d, nodeId, triggerPort, resolvedVariant) => {
        console.log("Resolving polymorphic group", { nodeId, triggerPort, resolvedVariant })
        const node = d.data.nodes[nodeId];

        if(!Port.isPolymorphic(triggerPort) || !triggerPort.polymorphicGroupId)
            throw new Error(`Port ${triggerPort.id} is not polymorphic or does not have a polymorphicGroupId`);

        const polymorphicGroupId = triggerPort.polymorphicGroupId;

        node.polymorphicResolutions = node.polymorphicResolutions ?? {};
        node.polymorphicResolutions[polymorphicGroupId] = resolvedVariant;
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
    unresolveGroup: (d, nodeId, polymorphicGroupId) => {
        const node = d.data.nodes[nodeId];

        if(!node.polymorphicResolutions)
            return

        delete node.polymorphicResolutions[polymorphicGroupId]

        if(Object.values(node.polymorphicResolutions).length === 0)
            delete node.polymorphicResolutions

        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
}

export interface NodePolymorphismReducers {
    resolveGroup   : (document: Document, nodeId: NodeId, triggerPort: Foundations.Port.Input | Foundations.Port.Output, resolvedVariant: Foundations.Port.Variant) => void
    unresolveGroup : (document: Document, nodeId: NodeId, polymorphicGroupId: Foundations.Port.PolymorphicGroupId) => void
}
