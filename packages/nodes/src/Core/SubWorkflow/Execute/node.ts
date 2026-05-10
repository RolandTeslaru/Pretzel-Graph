import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Execution, SystemError, Workflow } from "@pretzel-graph/shared/domain";
import { AggexCompilerError, AggexEngine, CompilationContext, extendCompilePath } from "@pretzel-graph/worker";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {
    public readonly Blueprint = Blueprint;

    private localEngineCtx: AggexEngine.ExecutionContext | null = null;

    protected override async onCompile(
        compilationContext: CompilationContext,
    ): Promise<void> {
        const globalEngineCtx = this.context as AggexEngine.ExecutionContext;
        const { compilePath } = compilationContext;
        const subWorkflowId = this.fields.workflowId as Workflow.Id;

        if (compilePath.includes(subWorkflowId)) {
            const cyclePath = [...compilePath, subWorkflowId];
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_SUBWORKFLOW_CYCLE,
                `Recursive sub-workflow: ${cyclePath.join(" -> ")}`,
                { data: { nodeId: this.workflowNode.id, cyclePath } },
            );
        }

        const dependency = this.context.workflowData.dependencies?.[subWorkflowId];

        if (!dependency)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Missing dependency workflow "${subWorkflowId}" for Execute Sub-Workflow node`,
                { data: { nodeId: this.workflowNode.id, workflowId: subWorkflowId } },
            );

        if (!globalEngineCtx.compileWorkflow)
            throw new Error("SubWorkflow.Execute node missing compileWorkflow context hook");

        const childCompilationCtx = extendCompilePath(compilationContext, subWorkflowId);

        const subExecution: Execution = {
            id:          this.context.executionId,
            workflow_id: subWorkflowId,
            igniter:     { variant: "workbench_manual" },
            status:      "running",
            duration:    0,
            session:     this.context.session,
            chat_id:     this.context.chat_id,
            created_at:  new Date().toISOString(),
            updated_at:  new Date().toISOString(),
        };

        this.localEngineCtx = await globalEngineCtx.compileWorkflow(
            dependency.workflow_id,
            dependency.workflow_data,
            subExecution,
            this.context.emit,
            childCompilationCtx,
        ) as AggexEngine.ExecutionContext;
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        if (!this.localEngineCtx)
            throw new Error("SubWorkflow.Execute node not properly compiled");

        if (!this.context.runSubWorkflow)
            throw new Error("SubWorkflow.Execute node missing runSubWorkflow context hook");

        this.localEngineCtx.nodeRuntimeMap.forEach(({ wfNode, instance }) => {
            if (wfNode.blueprintId !== "Core.SubWorkflow.ExposeInputPort")
                return;

            if (!("injectedData" in instance))
                return;

            const bridgeId = wfNode.id as keyof InferInputs<typeof Blueprint>;
            instance.injectedData = inputs[bridgeId];
        });

        try {
            await this.context.runSubWorkflow(this.localEngineCtx);

            const result: Partial<InferOutputs<typeof Blueprint>> = {};
            this.localEngineCtx.nodeRuntimeMap.forEach(({ wfNode, instance }) => {
                if (wfNode.blueprintId !== "Core.SubWorkflow.ExposeOutputPort")
                    return;

                if (!("ejectedData" in instance))
                    return;

                (result as Record<string, unknown>)[wfNode.id] = instance.ejectedData;
            });

            return result;
        } catch (err) {
            throw new Error(`Error executing sub-workflow: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
