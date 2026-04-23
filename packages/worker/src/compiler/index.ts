import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Foundations, ExecutionSession, Orchestrator } from "@vx-agent-editor/shared/domain";
import { CatalogueService } from "src/services/Catalogue/service";
import { SystemError } from "@vx-agent-editor/shared/domain/SystemError";
import { AggexCompilerError } from "../errors";
import { RuntimeNode } from "../node";
import { Emitter } from "../event/emitter";
import { StreamController } from "../context/stream-controller";
import { S2Graph, Vertex } from "../S2/graph";
import { load } from "@langchain/core/load";
import { BaseMessage } from "@langchain/core/messages";
import { resolveFields } from "../utils";
import { CompilationContext, createCompilationContext } from "./context";
import { AggexEngine } from "src/engine";
import { produce } from "immer";

export { CompilationContext, createCompilationContext, extendCompilePath } from "./context";


export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflowId: Workflow.Id,
        workflowData: Workflow.Data,
        jobId: Orchestrator.Job.Id,
        session: ExecutionSession,
        emit: Emitter,
        compilationContext: CompilationContext = createCompilationContext(workflowId),
    ): Promise<AggexEngine.ExecutionContext> {
        const workflowCache = Workflow.createCache(workflowData);

        const graph = new S2Graph();
        const nodes = workflowData.nodes;
        const edges = workflowData.edges;

        // START vertex — S2Engine ignites from here
        graph.addVertex(S2Graph.START_VERTEX_ID);

        // Reconstruct BaseMessage instances from plain serialized objects (messages arrive as JSON over HTTP/Redis)
        const reconstructedMessages = await Promise.all(
            session.messages.map(async (msg) => {
                if (msg instanceof BaseMessage) return msg;
                return load(JSON.stringify(msg)) as Promise<BaseMessage>;
            })
        );

        session = produce(session, d => { d.messages = reconstructedMessages});

        const nodeInstanceMap = new Map() as AggexEngine.ExecutionContext["nodeInstanceMap"];

        
        // 
        // Build contexts
        // 
        
        const abortController = new AbortController();
        
        const nodeExecutionCtx = {
            jobId,
            session,
            workflowData,
            workflowCache,
            emit,
            abortWorkflow: (reason) => abortController.abort(reason),
            updateSession: (recipe) => {
                session = produce(session, recipe);
            },
            abortSignal: abortController.signal,
            workflowId: workflowId
        } satisfies RuntimeNode.ExecutionContext


        const engineExecutionCtx = {
            ...nodeExecutionCtx,
            compiledGraph: graph,
            nodeInstanceMap,
        } satisfies AggexEngine.ExecutionContext




        // Add nodes to the graph
        for (const wfNode of Object.values(nodes))
            await this.prepareNode(wfNode, engineExecutionCtx, compilationContext);

        // Add Edges. Might also get ran multiple times because nodes can have multiple edges between them because of ports.
        for (const edge of Object.values(edges)) {
            const sourceNode = nodes[edge.source.nodeId];
            const targetNode = nodes[edge.target.nodeId];

            if(sourceNode.isDisabled || targetNode.isDisabled)
                continue;

            graph.addDependency(
                edge.source.nodeId,
                edge.target.nodeId
            );
        }

        // Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes(nodes, edges);
        if (startNodes.length === 0)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NO_START_NODES,
                "No start nodes found — the graph may be empty"
            )

        startNodes.forEach(nodeId => {
            graph.addDependency(S2Graph.START_VERTEX_ID, nodeId);
        });

        return engineExecutionCtx;
    }

    private async prepareNode(
        wfNode: Workflow.Node,
        engineExecutionCtx: AggexEngine.ExecutionContext,
        compilationContext: CompilationContext,
    ): Promise<void> {
        const NodeConstructor = await CatalogueService.getNode(wfNode.blueprintId);

        const { compiledGraph: graph, nodeInstanceMap } = engineExecutionCtx;

        if (!NodeConstructor)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not find node with blueprintId "${wfNode.blueprintId}" in the catalogue`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } }
            )

        const nodeInstance = new NodeConstructor(wfNode, engineExecutionCtx);

        await nodeInstance.compile(compilationContext)

        const vertexId = wfNode.id as unknown as Vertex.Id;

        graph.addVertex(wfNode.id);

        nodeInstanceMap.set(vertexId, { wfNode, instance: nodeInstance });

        const fieldValues = resolveFields(wfNode.id, engineExecutionCtx.workflowData);

        // Set vertex execution strategy based on node fields. Default is "AND"
        if (Object.hasOwn(fieldValues, "signalDependency"))
            graph.setVertexStrategy(
                vertexId,
                fieldValues["signalDependency" as Foundations.Field.Id] as Vertex.STRATEGY
            );
    }
    

    private findStartNodes(
        nodes: Workflow.Data["nodes"],
        edges: Workflow.Data["edges"]
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



