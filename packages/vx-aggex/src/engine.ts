import { WorkflowCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow"; // Placeholder
import { Runtime } from "./runtime";
import { Orchestrator, Realtime } from "@vx-agent-editor/shared/types";

export class AggexEngine {
    private compiler = new WorkflowCompiler();
    constructor() { }

    public compile = this.compiler.compile;

    public async *stream(
        emit: Runtime.Emitter,
        compiledGraph: Runtime.CompiledGraph,
        initialInputs: Record<string, any>
    ): AsyncIterable<typeof Runtime.State.Update> {
        const state = {
            ...Runtime.State.INITIAL,
            // Pre-seed inputs if necessary
        };

        for await (const update of await compiledGraph.stream(state)){
            yield update
        }
    }


    public async run(initialInputs: Record<string, any>) {
        const state = {
            ...Runtime.State.INITIAL,
        };
        // return await this.compiledGraph.invoke(state);
    }
}
