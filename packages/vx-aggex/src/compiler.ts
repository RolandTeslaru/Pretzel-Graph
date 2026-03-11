import { RuntimeGraph, START, END, RuntimeState, RuntimeContext } from "./runtime";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { CatalogueService } from "src/services/Catalogue/service";
import type { AggexEngine } from "./engine";
import { PretzelCompilerError } from "./errors";
import { Synthesizer } from "./synthesizer";
import { ExecutionSession, Orchestrator } from "@vx-agent-editor/shared/domain";
import { Emitter } from "./event/emitter";
import { StateController } from "./runtime/state";
import { StreamController } from "./StreamController";
import { S2Graph } from "./S2Engine/graph";

export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflow: Workflow,
        jobId: Orchestrator.Job.Id,
        session: ExecutionSession,
        nodeRunnerFn: typeof AggexEngine.runNode,
        emit: Emitter,
    ): Promise<{ compiledGraph: S2Graph, context: RuntimeContext }> {
        const workflowCache = Workflow.createCache(workflow);

        const initialState = Synthesizer.synthesizeState(session)

        // Create the state graph
        const graph = new RuntimeGraph(RuntimeState.Definition);
        const nodes = workflow.data.nodes;
        const edges = workflow.data.edges;

        const context = {
            workflow,
            workflowCache,
            emit,
            jobId,
            stateController: new StateController(initialState),
            streamController: new StreamController()
        } satisfies RuntimeContext

        // Add nodes to the graph along with their run function
        for (const wfNode of Object.values(nodes)) {

            const NodeConstructor = await CatalogueService.getNode(wfNode.blueprintId);

            if (!NodeConstructor)
                throw new PretzelCompilerError(`Could not find node with blueprintId ${wfNode.blueprintId}`)

            const nodeInstance = new NodeConstructor(wfNode, context);

            await nodeInstance.init(context)

            graph.addNode(wfNode.id, async () => {
                return nodeRunnerFn(wfNode, nodeInstance, context);
            });
        }

        // Add Edges
        for (const edge of Object.values(edges)) {
            graph.addEdge(
                edge.source.nodeId,
                edge.target.nodeId
            );
        }

        // Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes(nodes, edges);
        if (startNodes.length === 0)
            throw new PretzelCompilerError("No start nodes found! Graph might be disconnected.")

        startNodes.forEach(nodeId => {
            graph.addEdge(START, nodeId);
        });

        console.log("\n==================== WORKFLOW COMPILATION ====================");
        console.log("Nodes:");
        for (const node of Object.values(nodes)) {
            console.log(`  [Node] ${node.displayName} (ID: ${node.id})`);
        }
        console.log("\nEdges:");
        for (const edge of Object.values(edges)) {
            const sourceNode = nodes[edge.source.nodeId];
            const targetNode = nodes[edge.target.nodeId];
            console.log(`  [Edge] ${sourceNode?.displayName} (${edge.source.nodeId} : ${String(edge.source.portId)}) ---> ${targetNode?.displayName} (${edge.target.nodeId} : ${String(edge.target.portId)})`);
        }
        console.log("\nStart Nodes:", startNodes);
        console.log("==============================================================\n");

        const compiledGraph = graph.compile();

        return { compiledGraph, context };
    }

    private findStartNodes(
        nodes: Workflow["data"]["nodes"],
        edges: Workflow["data"]["edges"]
    ): Workflow.Node.Id[] {
        const targetNodeIds: Set<Workflow.Node.Id> = new Set();
        Object.values(edges).forEach(edge => {
            targetNodeIds.add(edge.target.nodeId);
        })

        return Object.keys(nodes).filter(
            id => !targetNodeIds.has(id as Workflow.Node.Id)
        ) as Workflow.Node.Id[];
    }
}
