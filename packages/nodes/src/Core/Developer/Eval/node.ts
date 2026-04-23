import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFields, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { code } = this.fields;

        try {
            // Create a function that takes inputs and returns the result
            // Wrap in async IIFE to allow await usage in the script
            const fn = new Function('inputs', 'fields', 'session', `
                return (async () => {
                    ${code}
                })();
            `);

            const result = await fn(inputs, this.fields, this.context.session);

            return {
                output: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            };
        } catch (err) {
            return {
                output: `Error evaluating script: ${err instanceof Error ? err.message : String(err)}`
            };
        }
    }


}
