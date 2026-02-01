import { BaseMessage } from "@langchain/core/messages";

/**
 * The Global State of a running Vexr Graph.
 * This replaces the concept of "Wires" with a shared memory space.
 */
export interface VexrGraphState {
    /**
     * Stores the output of every node execution.
     * Key: Node ID
     * Value: The result returned by that node.
     * 
     * When Node B runs, it looks up `node_outputs[NodeA_ID]` to get its input.
     */
    node_outputs: Record<string, any>;

    /**
     * Shared Chat History (for Agentic workflows).
     * Nodes can append to this list.
     */
    messages: BaseMessage[];

    /**
     * Global artifacts (files, images) produced during the run.
     */
    artifacts: Record<string, any>;

    /**
     * Execution Metadata (e.g. current user, trace ID).
     */
    metadata: {
        userId?: string;
        runId?: string;
        [key: string]: any;
    };
}

/**
 * The initial empty state.
 */
export const INITIAL_STATE: VexrGraphState = {
    node_outputs: {},
    messages: [],
    artifacts: {},
    metadata: {}
};
