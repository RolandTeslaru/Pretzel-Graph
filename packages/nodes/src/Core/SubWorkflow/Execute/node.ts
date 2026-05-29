import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Execution, Workflow } from "@pretzel-graph/shared/domain";
import { AggexEngine, CompilationContext, extendCompilePath } from "@pretzel-graph/worker";
import { Node as ExposeInputPortNode } from "../ExposeInputPort/node";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    /** ExposeOutputPort nodes propagate parent outputs directly via enclosingNodeAPI
     *  as they fire — suppress automatic fan-out so the engine doesn't double-signal. */
    public override getPropagationStrategy() { return "none" as const }

    public readonly Blueprint = Blueprint;



    private subEnvironment!: ReturnType<RuntimeNode.ExecutionContext["subWorkflowAPI"]["createEnv"]>;
    private subEngineCtx!: AggexEngine.Execution.Context;



    protected override async onCompile(
        compilationContext: CompilationContext,
    ): Promise<void> {
        const { compilePath } = compilationContext;
        const subWorkflowId  = this.workflowNode.dependency?.workflowId as Workflow.Id;
        const dependencyMode = this.workflowNode.dependency?.mode ?? "publication";

        console.log(`[ExecuteSubWorkflow:onCompile] nodeId=${this.workflowNode.id} dependency=${JSON.stringify(this.workflowNode.dependency)} resolved subWorkflowId=${subWorkflowId}`);
        console.log(`[ExecuteSubWorkflow:onCompile] compilePath=${compilePath.join(" -> ")}`);

        if (compilePath.includes(subWorkflowId)) {
            const cyclePath = [...compilePath, subWorkflowId];
            throw new Error(`Recursive sub-workflow: ${cyclePath.join(" -> ")}`);
        }

        if (!subWorkflowId)
            throw new Error(`Missing dependency in Execute Sub-Workflow node ${this.workflowNode.id}`);

        const isDraft = dependencyMode === "draft";

        const childWorkflowData = isDraft
            ? structuredClone(this.context.dependencyAPI.getDraft(subWorkflowId).workflow_data)
            : structuredClone(this.context.dependencyAPI.getPublished(subWorkflowId).workflow_data);

        console.log(`[ExecuteSubWorkflow:onCompile] mode=${dependencyMode} dependency resolved for subWorkflowId=${subWorkflowId}`);

        const childCompilationCtx = extendCompilePath(compilationContext, subWorkflowId);

        const subExecution: Execution = {
            id:          this.context.executionId,
            workflow_id: subWorkflowId,
            recording:   null,
            igniter:     {
                variant: "sub_workflow",
                parentNodeId: this.workflowNode.id,
                subWorkflowPath: [...compilePath, subWorkflowId],
                record: false
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

            // getPropagationStrategy() returns "none" — ExposeOutputPort nodes propagate
            // parent outputs via enclosingNodeAPI as they fire; returning {} here avoids
            // a second fan-out signal from the engine on completion.
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
            const dynamicInputs = inputs as Record<string, unknown>;
            console.log(`[ExecuteSubWorkflow:onRun] injecting exposed_port_id=${exposeNodeId} value=${JSON.stringify(dynamicInputs[exposeNodeId])?.slice(0, 100)}`);
            instance.injectedData = dynamicInputs[exposeNodeId];
        }
    }
}
