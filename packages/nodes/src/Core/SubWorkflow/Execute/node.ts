import { RegisterNode, RuntimeNode, RuntimeRouterNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Execution, Workflow } from "@pretzel-graph/shared/domain";
import { AggexEngine, CompilationContext, extendCompilePath } from "@pretzel-graph/worker";
import { Node as ExposeInputPortNode } from "../ExposeInputPort/node";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    private subEnvironment!: ReturnType<RuntimeNode.ExecutionContext["subWorkflowAPI"]["createEnv"]>;
    private subEngineCtx!: AggexEngine.Execution.Context;



    protected override async onCompile(
        compilationContext: CompilationContext,
    ): Promise<void> {
        const { compilePath } = compilationContext;
        const subWorkflowId = (this.workflowNode.workflowDependencyId ?? this.fields.workflowId) as Workflow.Id;

        console.log(`[ExecuteSubWorkflow:onCompile] nodeId=${this.workflowNode.id} workflowDependencyId=${this.workflowNode.workflowDependencyId} fields.workflowId=${this.fields.workflowId} resolved subWorkflowId=${subWorkflowId}`);
        console.log(`[ExecuteSubWorkflow:onCompile] compilePath=${compilePath.join(" -> ")}`);

        if (compilePath.includes(subWorkflowId)) {
            const cyclePath = [...compilePath, subWorkflowId];
            throw new Error(`Recursive sub-workflow: ${cyclePath.join(" -> ")}`);
        }

        if(!subWorkflowId)
            throw new Error(`Missing workflowId field in Execute Sub-Workflow node ${this.workflowNode.id}`);

        const dependencyMode = this.fields.dependencyMode as string;
        const isDraft = dependencyMode === "latest-draft";

        const childWorkflowData = isDraft
            ? structuredClone(this.context.dependencyAPI.getDraft(subWorkflowId))
            : structuredClone(this.context.dependencyAPI.getPublished(subWorkflowId).workflow_data);

        console.log(`[ExecuteSubWorkflow:onCompile] mode=${dependencyMode} dependency resolved for subWorkflowId=${subWorkflowId}`);

        const childCompilationCtx = extendCompilePath(compilationContext, subWorkflowId);

        const subExecution: Execution = {
            id:          this.context.executionId,
            workflow_id: subWorkflowId,
            igniter:     {
                variant: "sub_workflow",
                parentNodeId: this.workflowNode.id,
                subWorkflowPath: [...compilePath, subWorkflowId],
            },
            status:      "running",
            duration:    0,
            session:     this.context.session,
            chat_id:     this.context.chat_id,
            created_at:  new Date().toISOString(),
            updated_at:  new Date().toISOString(),
        };

        this.subEnvironment = this.context.subWorkflowAPI.createEnv();

        const enclosingNodeAPI: RuntimeNode.ExecutionContext["enclosingNodeAPI"] = {
            writePort: (outputId, value) => {
                this.context.portAPI.write(this.workflowNode.id, outputId, value);
            },
            emitPort: (outputId) => {
                this.context.propagationAPI.emitPort(this.workflowNode.id, outputId);
            },
        };

        this.injectWorkflowConfigValues(childWorkflowData);

        console.log(`[ExecuteSubWorkflow:onCompile] compiling sub-workflow subWorkflowId=${subWorkflowId}`);
        this.subEngineCtx = await this.subEnvironment.compile(
            subWorkflowId,
            childWorkflowData,
            subExecution,
            this.context.emit,
            childCompilationCtx,
            enclosingNodeAPI,
        ) as AggexEngine.ExecutionContext;
        console.log(`[ExecuteSubWorkflow:onCompile] done — nodes=${Object.keys(this.subEngineCtx.workflowData.nodes).length}`);
    }



    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        console.log(`[ExecuteSubWorkflow:onRun] nodeId=${this.workflowNode.id} inputs keys=${Object.keys(inputs).join(", ")}`);

        this.injectInputNodeValues(inputs);

        try {
            console.log(`[ExecuteSubWorkflow:onRun] running sub-environment`);
            await this.subEnvironment.run(this.subEngineCtx);

            // This is a RuntimeRouterNode so completion does not fan out all output edges.
            // ExposeOutputPort nodes write/propagate parent outputs as they fire; returning {}
            // keeps ExecuteSubWorkflow from emitting a second completion-time signal.
            console.log(`[ExecuteSubWorkflow:onRun] sub-environment finished successfully`);
            return {};
        } catch (err) {
            console.error(`[ExecuteSubWorkflow:onRun] sub-environment threw:`, err);
            throw new Error(`Error executing sub-workflow: ${err instanceof Error ? err.message : String(err)}`);
        }
    }



    private injectWorkflowConfigValues(childWorkflowData: Workflow.Data): void {
        childWorkflowData.staticValues[Workflow.WORKFLOW_CONFIG_NODE_ID] = this.fields;
    }



    private injectInputNodeValues(inputs: InferInputs<typeof Blueprint>): void {
        const exposeInputNodes = this.subEngineCtx.workflowQueryAPI
            .getNodesByBlueprint("Core.SubWorkflow.ExposeInputPort" as any);

        for (const { node } of exposeInputNodes) {
            const instance = this.subEngineCtx.instanceRegistryAPI.get(node.id);
            if (!(instance instanceof ExposeInputPortNode))
                continue;

            const exposeNodeId = instance.fields.exposed_port_id;
            console.log(`[ExecuteSubWorkflow:onRun] injecting exposed_port_id=${exposeNodeId} value=${JSON.stringify(inputs[exposeNodeId])?.slice(0, 100)}`);
            // @ts-expect-error
            instance.injectedData = inputs[exposeNodeId];
        }
    }
}
