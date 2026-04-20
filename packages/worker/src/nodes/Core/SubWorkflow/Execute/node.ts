import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { Workbench, Workflow, SystemError } from "@vx-agent-editor/shared/domain";
import { AxiosService } from "src/axios";
import { CompilationContext, CompilationResult, WorkflowCompiler, extendCompilePath } from "src/compiler";
import { AggexEngine } from "src/engine";
import { AggexCompilerError } from "src/errors";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    private localEngine: AggexEngine | null = null;
    private localNodeInstanceMap: CompilationResult["nodeInstanceMap"] | null = null;

    protected override async onCompile(
        context: ExecutionContext,
        compilationContext: CompilationContext,
    ): Promise<void> {
        const subWorkflowId = this.fields.workflowId as Workflow.Id;

        if (compilationContext.compilePath.includes(subWorkflowId)) {
            const cyclePath = [...compilationContext.compilePath, subWorkflowId];
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_SUBWORKFLOW_CYCLE,
                `Recursive sub-workflow: ${cyclePath.join(" → ")}`,
                { data: { nodeId: this.workflowNode.id, cyclePath } },
            );
        }

        let subWorkflow = compilationContext.workflowCache.get(subWorkflowId);
        if (!subWorkflow) {
            const res = await Workbench.API.Workflow.get(AxiosService.api, { workflowId: subWorkflowId });
            subWorkflow = { id: res.workflow.id, data: res.workflow.data };
            compilationContext.workflowCache.set(subWorkflowId, subWorkflow);
        }

        const childCtx = extendCompilePath(compilationContext, subWorkflowId);

        const compilationResult = await new WorkflowCompiler().compile(
            subWorkflow.id, subWorkflow.data, context.jobId, context.session, context.emit, childCtx,
        );
        this.localNodeInstanceMap = compilationResult.nodeInstanceMap;
        this.localEngine = new AggexEngine(compilationResult);
    }


    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { workflowId: _workflowId } = this.fields;

        if(!this.localEngine || !this.localNodeInstanceMap) {
            throw new Error("SubWorkflow.Execute node not properly compiled");
        }

        // Inject parent workflow data stream into node
        this.localNodeInstanceMap.forEach(({wfNode, instance}) => {
            if(wfNode.blueprintId === "Core.SubWorkflow.ExposeInputPort" && "injectedData" in instance){
                // The exposed port id is the same as the local node id of the ExposeInputPort node
                const bridgeId = wfNode.id as keyof InferInputs<typeof Blueprint>;
                instance.injectedData = inputs[bridgeId];
            }
        })

        try {
            await this.localEngine.run()
            
            const result: Partial<InferOutputs<typeof Blueprint>> = {};
            // Extract data from nodes
            this.localNodeInstanceMap.forEach(({wfNode, instance}) => {
                if(wfNode.blueprintId === "Core.SubWorkflow.ExposeOutputPort" && "ejectedData" in instance){
                    // The exposed port id is the same as the local node id of the ExposeOutputPort node
                    (result as Record<string, unknown>)[wfNode.id] = instance.ejectedData;
                }
            })
            return result;
        }
        catch (err) {
            throw new Error(`Error executing sub-workflow: ${(err as Error).message}`);
        }
    }
}