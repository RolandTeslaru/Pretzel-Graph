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
        const subWorkflowId = this.fields.workflowId as Workflow.Id;

        if (compilePath.includes(subWorkflowId)) {
            const cyclePath = [...compilePath, subWorkflowId];
            throw new Error(`Recursive sub-workflow: ${cyclePath.join(" -> ")}`);
        }

        const dependency = this.context.workflowData.dependencies?.[subWorkflowId];

        if (!dependency)
            throw new Error(`Missing dependency workflow "${subWorkflowId}" for Execute Sub-Workflow node`);

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

        this.subEngineCtx = await this.subEnvironment.compile(
            dependency.workflow_id,
            dependency.workflow_data,
            subExecution,
            this.context.emit,
            childCompilationCtx,
            parentBridgeHooks,
        ) as AggexEngine.ExecutionContext;
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        // Inject inputs into sub-workflow
        this.subEngineCtx.nodeRuntimeMap.forEach(({ wfNode, instance }) => {
            if(instance instanceof ExposeInputPortNode === false)
                return

            const exposeNodeId = instance.fields.exposed_port_id;
            // @ts-expect-error
            instance.injectedData = inputs[exposeNodeId];
        });

        try {
            await this.subEnvironment.run(this.subEngineCtx);

            // This is a RuntimeRouterNode so completion does not fan out all output edges.
            // ExposeOutputPort nodes write/propagate parent outputs as they fire; returning {}
            // keeps ExecuteSubWorkflow from emitting a second completion-time signal.
            return {};
        } catch (err) {
            throw new Error(`Error executing sub-workflow: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
