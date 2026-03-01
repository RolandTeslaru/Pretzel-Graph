import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ChatOpenAI } from "@langchain/openai";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { Synthesizer } from "src/synthesizer";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatOpenAI;

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);
        this.llm = new ChatOpenAI(this.fields);
    }

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { input, systemMessage } = inputs;

        const response = await this.llm.invoke([
            Synthesizer.coerceMessage("system", systemMessage),
            Synthesizer.coerceMessage("human", input)
        ]);

        return { 
            response, 
            languageModel: this.llm 
        };
    }





    public override async onConversion(
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Blueprint
    }
}
