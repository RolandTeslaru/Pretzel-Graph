import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { Runtime } from "src/runtime";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        fields: Runtime.InferFields<typeof Blueprint>,
        inputs: Runtime.InferInputs<typeof Blueprint>,
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { code } = fields;

        try {
            // Create a function that takes inputs and returns the result
            // Wrap in async IIFE to allow await usage in the script
            const fn = new Function('inputs', 'fields', 'state', `
                return (async () => {
                    ${code}
                })();
            `);

            const result = await fn(inputs, fields, state);

            return {
                output: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            };
        } catch (err) {
            return {
                output: `Error evaluating script: ${err instanceof Error ? err.message : String(err)}`
            };
        }
    }

    public override async onReconcile(
        changedFieldId: Foundations.Field.Id,
        newValue: Foundations.Field.Value,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}
