import { Workflow } from "@vx-agent-editor/shared/domain";

export class StreamController {
    constructor() { }

    /**
     * The node whose streamed LLM tokens should be treated
     * as the user-facing conversation output.
     * Set by the Chat Output node at compile time.
     */
    public conversationSourceNodeId: Workflow.Node.Id | null = null;
}


