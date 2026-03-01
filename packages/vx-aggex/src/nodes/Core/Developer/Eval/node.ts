import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);
    }

    public override async run(
        state: RuntimeState,
        fields: InferFields<typeof Blueprint>,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

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


}
