import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Execution, Workflow } from "@pretzel-graph/shared/domain";
import { AggexEngine, WorkflowCompiler } from "@pretzel-graph/worker";
import { System } from "@pretzel-graph/shared/system";
import { Node as ExposeInputPortNode } from "../ExposeInputPort/node";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    /** ExposeOutputPort nodes propagate parent outputs directly via enclosingNodeAPI
     *  as they fire — suppress automatic fan-out so the engine doesn't double-signal. */
    protected override PROPAGATION_STRATEGY = "none" as const

    public readonly Blueprint = Blueprint;



    private subEnvironment!: ReturnType<RuntimeNode.ExecutionContext["subWorkflowAPI"]["createEnv"]>;
    private subEngineCtx!: AggexEngine.Execution.Context;



    protected override async onCompile(
        compilationCtx: WorkflowCompiler.Compilation.Context,
    ): Promise<void> {
        const { compilePath, parentWorkflowIgniter } = compilationCtx;
        const subWorkflowId  = this.workflowNode.dependency?.workflowId as Workflow.Id;
        const dependencyMode = this.workflowNode.dependency?.mode ?? "publication";

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

        const igniter = {
            variant:         "sub_workflow",
            parentNodeId:    this.workflowNode.id,
            subWorkflowPath: [...compilePath, subWorkflowId],
            record:          parentWorkflowIgniter ? parentWorkflowIgniter.record : false
        } satisfies Execution.Igniter;

        const childCompilationCtx = {
            compilePath: [...compilePath, subWorkflowId],
            parentWorkflowIgniter: igniter,
        }

        const subExecution: Execution = {
            id:          this.context.executionId,
            workflow_id: subWorkflowId,
            recording:   null,
            igniter,
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

        this.subEngineCtx = await this.subEnvironment.compile(
            subWorkflowId,
            childWorkflowData,
            subExecution,
            this.context.emit,
            childCompilationCtx,
            enclosingNodeAPI,
        ) as AggexEngine.ExecutionContext;
    }



    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        this.injectInputNodeValues(inputs);

        try {
            await this.subEnvironment.run(this.subEngineCtx);

            // getPropagationStrategy() returns "none" — ExposeOutputPort nodes propagate
            // parent outputs via enclosingNodeAPI as they fire; returning {} here avoids
            // a second fan-out signal from the engine on completion.
            return {};
        } catch (err) {
            System.log.error("[ExecuteSubWorkflow:onRun] sub-environment threw", {
                error: err instanceof Error ? err.message : String(err),
            });
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
            System.log.debug("[ExecuteSubWorkflow:onRun] injecting exposed input port", {
                exposed_port_id: exposeNodeId,
                value:           JSON.stringify(dynamicInputs[exposeNodeId])?.slice(0, 100),
            });
            instance.injectedData = dynamicInputs[exposeNodeId];
        }
    }
}
