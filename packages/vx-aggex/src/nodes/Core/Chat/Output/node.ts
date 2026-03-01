import { RegisterNode } from "../../../../services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { Workflow } from "@vx-agent-editor/shared/domain";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { Synthesizer } from "src/synthesizer";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);

        const incomingEdges = props.workflowCache.incomingEdgesMap[props.workflowNode.id];
        const upstreamNodeId = Object.keys(incomingEdges)[0] as Workflow.Node.Id | undefined;

        if (upstreamNodeId) {
            props.state.streamController.conversationSourceNodeId = upstreamNodeId;
        }
    }

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { input } = inputs;

        state.messages.push(Synthesizer.coerceMessage("ai", input));
        return {};
    }
}