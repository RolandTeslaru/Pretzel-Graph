import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { Workbench, Workflow, SystemError } from "@vx-agent-editor/shared/domain";
import { AxiosService } from "src/axios";
import { CompilationContext, extendCompilePath } from "src/compiler";
import { AggexEngine } from "src/engine";
import { AggexCompilerError } from "src/errors";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;
    
    private localEngineCtx: AggexEngine.ExecutionContext | null = null;

    constructor(wfNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(wfNode, context);
    }

    protected override async onCompile(
        compilationContext: CompilationContext,
    ): Promise<void> {
        const globalEngineCtx = this.context as unknown as AggexEngine.ExecutionContext;
        const { workflowsMap, compilePath } = compilationContext;
        const subWorkflowId = this.fields.workflowId as Workflow.Id;

        // Detect cycles in sub-workflow calls
        if (compilePath.includes(subWorkflowId)) {
            const cyclePath = [...compilePath, subWorkflowId];
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_SUBWORKFLOW_CYCLE,
                `Recursive sub-workflow: ${cyclePath.join(" → ")}`,
                { data: { nodeId: this.workflowNode.id, cyclePath } },
            );
        }


        // Fetch sub-workflow if its not in the map
        let subWorkflow = workflowsMap.get(subWorkflowId);
        if (!subWorkflow) {
            const res = await Workbench.API.Workflow.get(AxiosService.api, { workflowId: subWorkflowId });
        
            subWorkflow = { 
                id: res.workflow.id, 
                data: res.workflow.data 
            };
        
            workflowsMap.set(subWorkflowId, subWorkflow);
        }

        const childCtx = extendCompilePath(compilationContext, subWorkflowId);

        this.localEngineCtx = await globalEngineCtx.compileWorkflow(
            subWorkflow.id, subWorkflow.data, this.context.jobId, this.context.session, this.context.emit, childCtx,
        );
    }


    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { workflowId: _workflowId } = this.fields;

        if(!this.localEngineCtx) {
            throw new Error("SubWorkflow.Execute node not properly compiled");
        }

        // Inject parent workflow data stream into node
        this.localEngineCtx.nodeInstanceMap.forEach(({wfNode, instance}) => {
            if(wfNode.blueprintId === "Core.SubWorkflow.ExposeInputPort" && "injectedData" in instance){
                // The exposed port id is the same as the local node id of the ExposeInputPort node
                const bridgeId = wfNode.id as keyof InferInputs<typeof Blueprint>;
                instance.injectedData = inputs[bridgeId];
            }
        })

        try {
            await this.localEngineCtx.runSubWorkflow(this.localEngineCtx)
            
            const result: Partial<InferOutputs<typeof Blueprint>> = {};
            // Extract data from nodes
            this.localEngineCtx.nodeInstanceMap.forEach(({wfNode, instance}) => {
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