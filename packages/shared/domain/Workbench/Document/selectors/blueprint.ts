import type { Foundations } from "../../../Foundations";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const blueprintSelectors: BlueprintSelectors = {
    get: (d, blueprintId) => d.blueprints[blueprintId] ?? null,

    // Takes the node rather than its id, so it also resolves nodes that live inside a
    // dependency's data rather than the workflow's own.
    ofNode: (d, node) => d.blueprints[node.reconciledBlueprintId ?? node.blueprintId] ?? null,

    forNode: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        if (!node)
            return null;

        return d.selectors.blueprint.ofNode(d, node);
    },
}

export interface BlueprintSelectors {
    get     : (document: Document, blueprintId: Foundations.Blueprint.Id) => Foundations.Blueprint | null;
    ofNode  : (document: Document, node: Workflow.Node.Raw) => Foundations.Blueprint | null;
    forNode : (document: Document, nodeId: Workflow.Node.Id) => Foundations.Blueprint | null;
}
