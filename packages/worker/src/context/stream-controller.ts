import { Workflow } from "@pretzel-graph/shared/domain";

type OnLlmChunkCallback = (content: string) => void;

export class StreamController {
    constructor() { }

    private register = new Map<Workflow.Node.Id, Set<OnLlmChunkCallback>>();


    public yieldLlmChunk(nodeId: Workflow.Node.Id, content: string) {
        const callbacks = this.register.get(nodeId);

        if (callbacks) {
            callbacks.forEach(cb => cb(content))
        }
    }
    public onLlmChunk(nodeId: Workflow.Node.Id, callback: OnLlmChunkCallback) {
        let callbacks = this.register.get(nodeId);

        if (!callbacks) {
            callbacks = new Set();
            this.register.set(nodeId, callbacks);
        }

        callbacks.add(callback);
    }

    public disposeLlmCallbacks(nodeId: Workflow.Node.Id) {
        this.register.delete(nodeId);
    }

    public disposeAll(){
        this.register.clear();
    }
}


