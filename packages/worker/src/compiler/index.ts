import { Execution, Foundations, Vault } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { CatalogueService, RuntimeNode, mapFieldValues } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { decryptCredentialBlob } from "src/credentials";

import { AggexCompilerError } from "../errors";
import { S2Graph, Vertex } from "../S2/graph";
import { isUUID } from "../utils";

import { produce } from "immer";
import { AggexEngine } from "src/engine";


export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflowId:          Workflow.Id,
        workflowData:        Workflow.Data,
        execution:           Execution,
        emit:                RuntimeNode.ExecutionContext["emit"],
        engine:              AggexEngine,
        credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
        compilationCtx:    WorkflowCompiler.Compilation.Context = createCompilationContext(workflowId),
        enclosingNodeAPI?: RuntimeNode.ExecutionContext["enclosingNodeAPI"],
    ): Promise<AggexEngine.Execution.Context> {
        const workflowCache = Workflow.createCache(workflowData);

        const graph = new S2Graph();    
        const nodes = workflowData.nodes;
        const edges = workflowData.edges;

        // START vertex — S2Engine ignites from here
        graph.addVertex(S2Graph.START_VERTEX_ID);

        //
        // Build contexts
        //
        
        const abortController = new AbortController();
        
        const updateSession = (r: (draft: Execution.Session) => void) => {
            execution.session = produce(execution.session, r);
        };

        let engineExecutionCtx!: AggexEngine.Execution.Context;

        const portAPI = {
            write: (nodeId, outputId, value) => {
                engine.portAPI.write(engineExecutionCtx, nodeId, outputId, value);
            },
        } satisfies RuntimeNode.ExecutionContext["portAPI"];

        const propagationAPI = {
            emitPort: (nodeId, outputId) => {
                engine.propagationAPI.emitPort(engineExecutionCtx, nodeId, outputId);
            },
            emitNode: (nodeId) => {
                engine.propagationAPI.emitNode(engineExecutionCtx, nodeId);
            },
        } satisfies RuntimeNode.ExecutionContext["propagationAPI"];

        const instanceRegistryAPI = {
            get:    (nodeId: Workflow.Node.Id) => engine.instanceRegistryAPI.get(nodeId),
            getAll: ()                         => engine.instanceRegistryAPI.getAll(),
        } satisfies RuntimeNode.ExecutionContext["instanceRegistryAPI"];

        const workflowQueryAPI = {
            getNodesByBlueprint: <T_Blueprint extends Blueprint>(blueprintId: T_Blueprint["id"]) => Object.values(engineExecutionCtx.workflowData.nodes)
                .filter(n => n.blueprintId === blueprintId)
                .map(n => ({
                    node:   n,
                    fields: mapFieldValues<T_Blueprint>(n.id, engineExecutionCtx.workflowData),
                })),
            getNodeOutput: (nodeId, portId) =>
                engineExecutionCtx.session.node_output_instances[nodeId]?.[portId],
        } satisfies RuntimeNode.ExecutionContext["workflowQueryAPI"];

        const schedulerAPI = {
            fireNode:      (nodeId, signals) => engine.schedulerAPI.fireNode(engineExecutionCtx, nodeId, signals),
            signalNode:    (nodeId, fromNodeId) => engine.schedulerAPI.signalNode(engineExecutionCtx, nodeId, fromNodeId),
            removeSignal:  (nodeId, fromNodeId) => engine.schedulerAPI.removeSignal(engineExecutionCtx, nodeId, fromNodeId),
            clearSignals:  (nodeId) => engine.schedulerAPI.clearSignals(engineExecutionCtx, nodeId),
            scheduleCheck: (nodeId) => engine.schedulerAPI.scheduleCheck(engineExecutionCtx, nodeId),
        } satisfies RuntimeNode.ExecutionContext["schedulerAPI"];


        const subWorkflowAPI = {
            createEnv: () => {
                const engine = new AggexEngine();
                const compiler = new WorkflowCompiler();

                return {
                    compile: (
                        workflowId,
                        workflowData,
                        execution,
                        emit,
                        compilationCtx,
                        enclosingNodeAPI,
                    ) => compiler.compile(
                        workflowId,
                        workflowData,
                        execution,
                        emit,
                        engine,
                        credentialInstances,
                        compilationCtx,
                        enclosingNodeAPI,
                    ),
                    run: (ctx: unknown) => engine.run(ctx as AggexEngine.Execution.Context),
                }
            }
        } satisfies RuntimeNode.ExecutionContext["subWorkflowAPI"];

        const dependencyAPI = {
            getPublished: (wfId: Workflow.Id) => {
                const dep = workflowData.dependencies?.published?.[wfId];
                if (!dep) throw new Error(`Missing published dependency "${wfId}"`);
                return dep;
            },
            getDraft: (wfId: Workflow.Id) => {
                const draft = workflowData.dependencies?.draft?.[wfId];
                if (!draft) throw new Error(`Missing draft dependency "${wfId}"`);
                return draft;
            },
        } satisfies RuntimeNode.ExecutionContext["dependencyAPI"];

        const credentialsAPI: RuntimeNode.ExecutionContext["credentialsAPI"] = {
            getInstance: (instanceId) => credentialInstances[instanceId],
            getDecryptedValue: (blob) => decryptCredentialBlob(blob) as any,
        };

        const nodeExecutionCtx = {
            executionId: execution.id,
            workflowId,
            chat_id: execution.chat_id,
            workflowData,
            workflowCache,
            get session() { return execution.session; },
            emit,
            abortAPI: {
                signal: abortController.signal,
                abort:  (reason?: any) => abortController.abort(reason),
            },
            updateSession,
            portAPI,
            propagationAPI,
            instanceRegistryAPI,
            workflowQueryAPI,
            schedulerAPI,
            enclosingNodeAPI,
            subWorkflowAPI,
            dependencyAPI,
            credentialsAPI,
        } satisfies RuntimeNode.ExecutionContext

        engineExecutionCtx = {
            executionId: execution.id,
            workflowId,
            chat_id: execution.chat_id,
            workflowData,
            workflowCache,
            get session() { return execution.session; },
            emit,
            abortAPI: {
                signal: abortController.signal,
                abort:  (reason?: any) => abortController.abort(reason),
            },
            updateSession,
            compiledGraph: graph,
            activeNodes: new Set(),
            portAPI,
            propagationAPI,
            instanceRegistryAPI,
            workflowQueryAPI,
            schedulerAPI,
            enclosingNodeAPI,
            subWorkflowAPI,
            dependencyAPI,
            credentialsAPI,
        } satisfies AggexEngine.Execution.Context



        // Add nodes to the graph
        for (const wfNode of Object.values(nodes))
            await this.prepareNode(engine, engineExecutionCtx, nodeExecutionCtx, wfNode, compilationCtx);

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
        const startNodes = this.findStartNodes(nodes, edges, (id) => engine.instanceRegistryAPI.get(id));
        if (startNodes.length === 0)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NO_START_NODES,
                "No start nodes found — the graph may be empty"
            )

        startNodes.forEach(nodeId => {
            graph.addDependency(S2Graph.START_VERTEX_ID, nodeId);
        });
        
        await this.handleIgniter(engine, execution.igniter);

        return engineExecutionCtx;
    }




    private async handleIgniter(
        engine:  AggexEngine,
        igniter: Execution.Igniter,
    ){
        switch (igniter.variant) {
            case "webhook": {
                const instance = engine.instanceRegistryAPI.get(igniter.nodeId as Workflow.Node.Id);
                if (instance)
                    await instance.triggerWebhook(igniter.payload as Record<string, unknown>);
                break;
            }
            case "chat_message": {
                for (const instance of engine.instanceRegistryAPI.getAll())
                    await instance.handleIgniter(igniter);
                break;
            }
        }
    }




    private async prepareNode(
        engine:             AggexEngine,
        engineExecutionCtx: AggexEngine.Execution.Context,
        nodeExecutionCtx:   RuntimeNode.ExecutionContext,
        wfNode:             Workflow.Node,
        compilationCtx:     WorkflowCompiler.Compilation.Context,
    ): Promise<void> {
        let RuntimeNode = await CatalogueService.getNode(wfNode.blueprintId);

        const { compiledGraph: graph } = engineExecutionCtx;

        if (!RuntimeNode) {
            if (wfNode.dependency) {
                const { dependencies } = engineExecutionCtx.workflowData;
                const { workflowId, mode } = wfNode.dependency;
                const hasDep = mode === "publication"
                    ? !!dependencies?.published?.[workflowId]
                    : !!dependencies?.draft?.[workflowId];
                if (!hasDep)
                    throw new AggexCompilerError(
                        SystemError.Code.COMPILATION_MISSING_SUBWORKFLOW_DEPENDENCY,
                        `Missing dependency "${workflowId}" for node "${wfNode.id}"`,
                        { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId, missingDependencyId: workflowId } }
                    );
                RuntimeNode =  await CatalogueService.getNode("Core.SubWorkflow.Execute" as Foundations.Blueprint.Id);
            }
            else throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not find node with blueprintId "${wfNode.blueprintId}" in the catalogue`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } }
            )
        }

        const fieldValues = mapFieldValues(wfNode.id, engineExecutionCtx.workflowData);
        const nodeInstance = new RuntimeNode!(wfNode, nodeExecutionCtx);

        await nodeInstance.compile(compilationCtx)

        const vertexId = wfNode.id as unknown as Vertex.Id;

        graph.addVertex(wfNode.id);

        engine.registerNode(vertexId, wfNode, nodeInstance);


        // Set vertex execution strategy based on node fields. Default is "AND"
        if (Object.hasOwn(fieldValues, "signalDependency"))
            graph.setVertexStrategy(
                vertexId,
                fieldValues["signalDependency" as Foundations.Field.Id] as Vertex.STRATEGY
            );
    }
    



    private findStartNodes(
        nodes:       Workflow.Data["nodes"],
        edges:       Workflow.Data["edges"],
        getInstance: (id: Workflow.Node.Id) => RuntimeNode<Blueprint> | undefined,
    ): Workflow.Node.Id[] {
        const targetNodeIds = new Set<Workflow.Node.Id>();
        Object.values(edges).forEach(edge => targetNodeIds.add(edge.target.nodeId));

        return Object.keys(nodes).filter(id => {
            if (targetNodeIds.has(id as Workflow.Node.Id))
                return false;
            const instance = getInstance(id as Workflow.Node.Id);
            if (instance?.IS_PASSIVE)
                return false;
            return true;
        }) as Workflow.Node.Id[];
    }
}



export namespace WorkflowCompiler {
    export namespace Compilation {
        export interface Context {
            compilePath: readonly Workflow.Id[];
        }
    }

}

export function createCompilationContext(rootId: Workflow.Id): WorkflowCompiler.Compilation.Context {
    return { compilePath: [rootId] };
}

export function extendCompilePath(
    ctx: WorkflowCompiler.Compilation.Context,
    nextId: Workflow.Id,
): WorkflowCompiler.Compilation.Context {
    return {
        compilePath: [...ctx.compilePath, nextId],
    };
}
