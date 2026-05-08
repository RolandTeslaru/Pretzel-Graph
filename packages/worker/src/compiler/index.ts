import { Execution, Foundations } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Node as ChatInputNode } from "@pretzel-graph/nodes/Core/Chat/Input/node";
import { CatalogueService, RuntimeNode } from "@pretzel-graph/node-sdk";

import { AggexCompilerError } from "../errors";
import { S2Graph, Vertex } from "../S2/graph";
import { resolveFields } from "../utils";
import { SubWorkflowNormalizer } from "./normalizers/subworkflow";

import { produce } from "immer";
import { AggexEngine } from "src/engine";


export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflowId:     Workflow.Id,
        workflowData:   Workflow.Data,
        execution:      Execution,
        emit:           RuntimeNode.ExecutionContext["emit"],
        compilationCtx: WorkflowCompiler.Compilation.Context = createCompilationContext(workflowId),
    ): Promise<AggexEngine.Execution.Context> {
        const normalizedWorkflow = SubWorkflowNormalizer.normalize(
            workflowId,
            workflowData,
            { dependencyPath: compilationCtx.compilePath },
        );

        const normalizedWorkflowData = normalizedWorkflow.data;
        const workflowCache = Workflow.createCache(normalizedWorkflowData);

        const graph = new S2Graph();    
    const nodes = normalizedWorkflowData.nodes;
        const edges = normalizedWorkflowData.edges;

        // START vertex — S2Engine ignites from here
        graph.addVertex(S2Graph.START_VERTEX_ID);

        const nodeRuntimeMap = new Map() as AggexEngine.Execution.Context["nodeRuntimeMap"];
        
        // 
        // Build contexts
        // 
        
        const abortController = new AbortController();
        
        const updateSession = (r: (draft: Execution.Session) => void) => {
            execution.session = produce(execution.session, r);
        };

        const dummyEngine = new AggexEngine();

        const engineExecutionCtx = {
            get session()  { return execution.session; },
            workflowData: normalizedWorkflowData,
            workflowCache,
            runtimeMeta: normalizedWorkflow.runtimeMeta,
            emit,
            executionId: execution.id,
            chat_id: execution.chat_id,
            abortExecution: (reason: string) => abortController.abort(reason),
            updateSession,
            abortSignal: abortController.signal,
            workflowId,
            compiledGraph: graph,
            nodeRuntimeMap,
            activeNodes: new Set(),
            compileWorkflow: this.compile.bind(this),
            runSubWorkflow: dummyEngine.run.bind(dummyEngine),
        } satisfies AggexEngine.Execution.Context

        // Add nodes to the graph
        for (const wfNode of Object.values(nodes))
            await this.prepareNode(engineExecutionCtx, wfNode, compilationCtx);

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
        
        await this.handleIgniter(engineExecutionCtx, execution.igniter);

        return engineExecutionCtx;
    }




    private async handleIgniter(
        engineExecutionCtx: AggexEngine.Execution.Context, 
        igniter:            Execution.Igniter
    ){
        const { nodeRuntimeMap } = engineExecutionCtx;
        switch (igniter.variant) {
            case "webhook": {
                const entry = nodeRuntimeMap.get(igniter.nodeId as unknown as Vertex.Id);
                if (entry)
                    await entry.instance.triggerWebhook(igniter.payload as Record<string, unknown>);
                break;
            }
            case "chat_message": {
                for (const entry of nodeRuntimeMap.values()) {
                    if (entry.instance instanceof ChatInputNode)
                        entry.instance.injectMessage(igniter.message);
                }
                break;
            }
        }
    }




    private async prepareNode(
        engineExecutionCtx: AggexEngine.Execution.Context,
        wfNode:             Workflow.Node,
        compilationCtx:     WorkflowCompiler.Compilation.Context,
    ): Promise<void> {
        const NodeConstructor = await CatalogueService.getNode(wfNode.blueprintId);

        const { compiledGraph: graph, nodeRuntimeMap } = engineExecutionCtx;

        if (!NodeConstructor)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not find node with blueprintId "${wfNode.blueprintId}" in the catalogue`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } }
            )

        const nodeInstance = new NodeConstructor(wfNode, engineExecutionCtx);

        await nodeInstance.compile(compilationCtx)

        const vertexId = wfNode.id as unknown as Vertex.Id;

        graph.addVertex(wfNode.id);

        nodeRuntimeMap.set(vertexId, { wfNode, instance: nodeInstance });

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



export namespace WorkflowCompiler {
    export namespace Compilation {
        export type Unit = Pick<Workflow, "id" | "data">;

        export interface Context {
            workflowsMap: Map<Workflow.Id, Unit>;
            compilePath: readonly Workflow.Id[];
        }
    }

}

export function createCompilationContext(rootId: Workflow.Id): WorkflowCompiler.Compilation.Context {
    return { workflowsMap: new Map(), compilePath: [rootId] };
}

export function extendCompilePath(
    ctx: WorkflowCompiler.Compilation.Context,
    nextId: Workflow.Id,
): WorkflowCompiler.Compilation.Context {
    return {
        workflowsMap: ctx.workflowsMap,
        compilePath: [...ctx.compilePath, nextId],
    };
}
