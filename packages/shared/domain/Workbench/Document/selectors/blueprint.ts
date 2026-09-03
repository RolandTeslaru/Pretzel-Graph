import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const blueprintSelectors = {
    get: (s, blueprintId) => s.blueprints[blueprintId] ?? null,

    // Takes the node rather than its id, so it also resolves nodes that live inside a
    // dependency's data rather than the workflow's own.
    ofNode: (s, node) => s.blueprints[node.reconciledBlueprintId ?? node.blueprintId] ?? null,

    forNode: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node)
            return null;

        return s.selectors.blueprint.ofNode(s, node);
    },
} satisfies BlueprintSelectors

export interface BlueprintSelectors {
    get     : (s: WorkbenchSDK.State, blueprintId: Foundations.Blueprint.Id) => Foundations.Blueprint | null;
    ofNode  : (s: WorkbenchSDK.State, node: Workflow.Node.Raw) => Foundations.Blueprint | null;
    forNode : (s: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Foundations.Blueprint | null;
}
