import { AggexCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow"; // Placeholder
import { Runtime } from "./runtime";

export class AggexEngine {
    private compiler = new AggexCompiler();
    constructor() { }

    /**
     * Run the graph with initial inputs.
     * Returns a stream of events.
     */
    public async stream(
        compiledGraph: Runtime.CompiledGraph,
        initialInputs: Record<string, any>
    ): Promise<AsyncIterable<typeof Runtime.State.Update>> {
        const state = {
            ...Runtime.State.INITIAL,
            // Pre-seed inputs if necessary
        };

        return await compiledGraph.stream(state);
    }

    public compile = this.compiler.compile;

    /**
     * Run and get final result.
     */
    public async run(initialInputs: Record<string, any>) {
        const state = {
            ...Runtime.State.INITIAL,
        };
        // return await this.compiledGraph.invoke(state);
    }
}
