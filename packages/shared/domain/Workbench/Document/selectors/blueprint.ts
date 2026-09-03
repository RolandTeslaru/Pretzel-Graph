import type { Foundations } from "../../../Foundations";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const blueprintSelectors: BlueprintSelectors = {
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
}

export interface BlueprintSelectors {
    get     : (s: Document, blueprintId: Foundations.Blueprint.Id) => Foundations.Blueprint | null;
    ofNode  : (s: Document, node: Workflow.Node.Raw) => Foundations.Blueprint | null;
    forNode : (s: Document, nodeId: Workflow.Node.Id) => Foundations.Blueprint | null;
}
