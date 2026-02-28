import { RegisterNode } from "../../../../services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { Workflow } from "@vx-agent-editor/shared/domain";
import { Runtime } from "src/runtime";
import { Synthesizer } from "src/synthesizer";
import { InferInputs, InferOutputs } from "src/types";


@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(props: Runtime.Node.ConstructorProps) {
        super(props);

        const incomingEdges = props.workflowCache.incomingEdgesMap[props.workflowNode.id];
        const upstreamNodeId = Object.keys(incomingEdges)[0] as Workflow.Node.Id | undefined;

        if (upstreamNodeId) {
            props.state.streamController.conversationSourceNodeId = upstreamNodeId;
        }
    }

    public override async run(
        state: Runtime.State,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { input } = inputs;

        state.messages.push(Synthesizer.coerceMessage("ai", input));
        return {};
    }
}