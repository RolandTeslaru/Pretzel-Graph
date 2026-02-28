import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ChatAnthropic } from "@langchain/anthropic";
import { Synthesizer } from "src/synthesizer";
import { Runtime } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatAnthropic;

    constructor(props: Runtime.Node.ConstructorProps) {
        super(props);
        this.llm = new ChatAnthropic(this.fields);
    }

    public override async run(
        state: Runtime.State,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { systemMessage, input } = inputs;

        const response = await this.llm.invoke([
            Synthesizer.coerceMessage("system", systemMessage),
            Synthesizer.coerceMessage("human", input),
        ]);

        return {
            response,
            languageModel: this.llm
        };
    }

}
