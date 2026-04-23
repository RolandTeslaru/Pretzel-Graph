import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { LC } from "src/langchain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;



    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        
        const toolList: LC.Tool[] = [];

        Object.entries(inputs).forEach(([key, value]) => {
            toolList.push(...value);
        });

        // Implement ToolDictionary node logic here
        return {
            tool_list: toolList,
        };
    }
}
