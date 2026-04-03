import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeNode, RuntimeRouterNode } from "src/node";
import { InferInputs, InferOutputs, OneOf } from "src/types";
import { Foundations } from "@vx-agent-editor/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> { // we dont really know what routes will be generated, so we return partial outputs

        const { cases } = this.fields;
        const { input } = inputs;


        for (const { condition, portId } of cases) {
            const result = Foundations.Field.Condition.evaluate(condition, inputs);
            
            if (result)
                return { [portId]: input } as OneOf<InferOutputs<typeof Blueprint>>;
        }
        
        return {}
    }
}
