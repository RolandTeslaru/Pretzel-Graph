import { RegisterNode, RuntimeNode, RuntimeRouterNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Execution, Workflow } from "@pretzel-graph/shared/domain";
import { AggexEngine, CompilationContext, extendCompilePath } from "@pretzel-graph/worker";
import { Node as ExposeInputPortNode } from "../ExposeInputPort/node";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    private subEnvironment!: ReturnType<RuntimeNode.ExecutionContext["subworkflowHooks"]["createEnv"]>;
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

        const dependency = this.context.workflowData.dependencies?.[subWorkflowId];

        console.log(`[ExecuteSubWorkflow:onCompile] dependency found=${!!dependency} availableDependencies=${Object.keys(this.context.workflowData.dependencies ?? {}).join(", ")}`);

        if (!dependency)
            throw new Error(`Missing dependency "${subWorkflowId}" for Execute Sub-Workflow node`);

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

        this.subEnvironment = this.context.subworkflowHooks.createEnv();

        const parentBridgeHooks: RuntimeNode.ExecutionContext["parentBridgeHooks"] = {
            writeToOutputPort: (outputId, value) => {
                this.context.portHooks.writeToOutputPort(this.workflowNode.id, outputId, value);
            },
            propagateFromOutputPort: (outputId) => {
                this.context.portHooks.propagateFromOutputPort(this.workflowNode.id, outputId);
            },
        };

        const childWorkflowData = structuredClone(dependency.workflow_data);

        this.injectWorkflowConfigValues(childWorkflowData);


        console.log(`[ExecuteSubWorkflow:onCompile] compiling sub-workflow dependency.workflow_id=${dependency.workflow_id}`);
        this.subEngineCtx = await this.subEnvironment.compile(
            dependency.workflow_id,
            childWorkflowData,
            subExecution,
            this.context.emit,
            childCompilationCtx,
            parentBridgeHooks,
        ) as AggexEngine.ExecutionContext;
        console.log(`[ExecuteSubWorkflow:onCompile] done — nodeRuntimeMap size=${this.subEngineCtx.nodeRuntimeMap.size}`);
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
        this.subEngineCtx.nodeRuntimeMap.forEach(({ wfNode, instance }) => {
            if (instance instanceof ExposeInputPortNode === false)
                return;

            const exposeNodeId = instance.fields.exposed_port_id;
            console.log(`[ExecuteSubWorkflow:onRun] injecting exposed_port_id=${exposeNodeId} value=${JSON.stringify(inputs[exposeNodeId])?.slice(0, 100)}`);
            // @ts-expect-error
            instance.injectedData = inputs[exposeNodeId];
        });
    }
}
