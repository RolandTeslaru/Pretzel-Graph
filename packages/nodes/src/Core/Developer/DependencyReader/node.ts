import type { Dependency } from "@pretzel-graph/shared/domain";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const ref = this.fieldValues.dependency;

        if (!ref)
            throw new Error("No dependency selected");

        return {
            snapshot: this.describe(ref),
        };
    }

    // Reads the embedded snapshot the ref points at through the dependency API.
    private describe(ref: Dependency.Ref) {
        const value     = this.context.dependencyAPI.get(ref);
        const nodeCount = Object.keys(value.workflow_data.nodes).length;

        switch (value.kind) {
            case "draftWorkflow":
                return {
                    kind:        ref.kind,
                    id:          ref.id,
                    displayName: value.display_name,
                    updatedAt:   value.updated_at,
                    nodeCount,
                };

            case "publishedWorkflow":
            case "listing":
                return {
                    kind:        ref.kind,
                    id:          ref.id,
                    displayName: value.display_name,
                    name:        value.name,
                    version:     value.version,
                    nodeCount,
                };
        }
    }
}
