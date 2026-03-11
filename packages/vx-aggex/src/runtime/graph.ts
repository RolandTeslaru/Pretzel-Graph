import { Workflow } from "@vx-agent-editor/shared/domain";
import { S2Graph, Vertex } from "../S2Engine/graph";
import { RuntimeState } from "./state";

export const START = "__START__";
export const END = "__END__";

export class RuntimeGraph {
    public readonly s2Graph: S2Graph;

    constructor(
        private readonly stateDefinition: RuntimeState.Definition
    ) {
        this.s2Graph = new S2Graph();
        
        // Ensure START vertex always exists for S2Engine to ignite flawlessly
        this.s2Graph.addVertex(START, async () => {});
    }

    public addNode(
        nodeId: Workflow.Node.Id, 
        action: () => Promise<void>
    ) {
        this.s2Graph.addVertex(nodeId, action);
    }

    public addEdge(
        sourceNodeId: string,
        targetNodeId: string
    ) {
        this.s2Graph.addDependency(sourceNodeId, targetNodeId);
    }

    public compile(): S2Graph {
        return this.s2Graph;
    }
}
