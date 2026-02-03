import { GraphCompiler } from "./compiler/GraphCompiler";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow"; // Placeholder
import { INITIAL_STATE } from "./runtime/state";

export class AggexEngine {
    private workflow: any; // Type as Workflow
    private compiledGraph: any;

    constructor(workflowInfo: any) {
        this.workflow = workflowInfo;
        const compiler = new GraphCompiler(workflowInfo);
        this.compiledGraph = compiler.compile();
    }

    /**
     * Run the graph with initial inputs.
     * Returns a stream of events.
     */
    async stream(initialInputs: Record<string, any>) {
        const state = {
            ...INITIAL_STATE,
            // Pre-seed inputs if necessary
        };

        return await this.compiledGraph.stream(state);
    }

    /**
     * Run and get final result.
     */
    async run(initialInputs: Record<string, any>) {
        const state = {
            ...INITIAL_STATE,
        };
        return await this.compiledGraph.invoke(state);
    }
}
