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
        switch (ref.kind) {
            case "draftWorkflow": {
                const draft = this.context.dependencyAPI.getDraft(ref.id);

                return {
                    kind:        ref.kind,
                    id:          ref.id,
                    displayName: draft.display_name,
                    updatedAt:   draft.updated_at,
                    nodeCount:   Object.keys(draft.data.nodes).length,
                };
            }

            case "publishedWorkflow":
            case "listing": {
                const publication = this.context.dependencyAPI.getPublished(ref.id);

                return {
                    kind:        ref.kind,
                    id:          ref.id,
                    displayName: publication.display_name,
                    name:        publication.name,
                    version:     publication.version,
                    nodeCount:   Object.keys(publication.workflow_data.nodes).length,
                };
            }
        }
    }
}
