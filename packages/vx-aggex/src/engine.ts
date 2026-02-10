import { WorkflowCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow"; // Placeholder
import { Runtime } from "./runtime";
import { cloneDeep } from "lodash";
import { Orchestrator } from "@vx-agent-editor/shared/types";

export class AggexEngine {
    private compiler = new WorkflowCompiler();
    constructor() { }

    public compile(workflow: Workflow, emit: Runtime.Emitter){
        return this.compiler.compile(workflow, emit)
    }

    public async *stream(
        compiledGraph: Runtime.CompiledGraph,
        initialInputs: Record<string, any>
    ): AsyncIterable<Runtime.State.Update> {
        const state = cloneDeep(Orchestrator.RuntimeState.INITIAL)

        for await (const update of await compiledGraph.stream(state)){
            yield update
        }
    }


    public async run(initialInputs: Record<string, any>) {
        const state = cloneDeep(Orchestrator.RuntimeState.INITIAL)
        // return await this.compiledGraph.invoke(state);
    }
}
