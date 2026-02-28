import { StateGraph, START, END, LangGraphRunnableConfig } from "@langchain/langgraph";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { CatalogueService } from "src/services/Catalogue/service";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { Runtime } from "src/runtime";
import { cloneDeep } from "lodash";
import { Synthesizer } from "./synthesizer";

export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflow: Workflow,
        emit: Runtime.Emitter,
        nodeRunnerFn: Runtime.NodeRunner
    ) {
        const workflowCache = Workflow.createCache(workflow);

        const initialState = cloneDeep(Orchestrator.SerializableState.INITIAL);
        const state = Synthesizer.synthesizeState(initialState);

        // Create the state graph
        const graph = new StateGraph(Runtime.State.Schema);
        const nodes = workflow.data.nodes;
        const edges = workflow.data.edges;

        // Add nodes to the graph along with their run function
        for (const node of Object.values(nodes)) {

            const VerticeConstructor = await CatalogueService.getNode(node.blueprintId);

            if (!VerticeConstructor)
                throw new Error(`Could not find vertice with blueprintId ${node.blueprintId}`)
            
            const vertex = new VerticeConstructor({
                workflow,
                workflowCache,
                workflowNode: node,
                state
            });
            graph.addNode(node.id, async (state) => {
                return nodeRunnerFn(state, node, vertex, workflow, workflowCache, emit);
            });
        }

        // Add Edges
        for (const edge of Object.values(edges)) {
            graph.addEdge(
                edge.source.nodeId as any,
                edge.target.nodeId as any
            );
        }

        // Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes(nodes, edges);
        if (startNodes.length === 0)
            throw new Error("AGGEX Compiler: No start nodes found! Graph might be disconnected.")

        startNodes.forEach(nodeId => {
            graph.addEdge(START, nodeId as "__start__");
        });

        const compiledGraph = graph.compile();



        return { compiledGraph, state };
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
