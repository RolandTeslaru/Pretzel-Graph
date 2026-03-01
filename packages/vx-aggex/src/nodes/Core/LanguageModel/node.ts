import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations } from "@vx-agent-editor/shared/domain";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { Node as GoogleGenerativeAINode } from "../../Google/GenerativeAI/node"
import { Node as OpenAIChatNode } from "../../OpenAI/Chat/node"
import { Node as AnthropicChatNode } from "../../Anthropic/Chat/node"

type Inputs = InferInputs<typeof Blueprint>
type Outputs = InferOutputs<typeof Blueprint>

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llmVertex: RuntimeNode<Foundations.Blueprint>

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);
        
        switch(this.fields.provider){
            case "Google":
                this.llmVertex = new GoogleGenerativeAINode(props);
                break;
            case "Anthropic":
                this.llmVertex = new AnthropicChatNode(props);
                break;
            case "OpenAI":
                this.llmVertex = new OpenAIChatNode(props);
                break;
            default:
                throw new Error(`Provider "${this.fields.provider}" not supported`)
        }
    }

    public override async run(
        state: RuntimeState,
        inputs: Inputs
    ): Promise<Outputs> {
        return await this.llmVertex.run(state, inputs) as Outputs
    }
}
