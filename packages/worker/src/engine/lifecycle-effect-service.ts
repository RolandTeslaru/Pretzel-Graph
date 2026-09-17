import type { RuntimeNode } from "@pretzel-graph/node-sdk";
import type { AggexEngine } from "./index";
import { bounded } from "../utils";

const HOOK_TIMEOUT_MS = 10_000;

// Lets this engine's nodes finish what they hold once its workflow run ends.
export class LifecycleEffectService {

    constructor(private readonly engine: AggexEngine) {}




    // Calls every node concurrently, each bounded; a failing node is logged, never thrown.
    public async runEnding(outcome: RuntimeNode.ExecutionOutcome): Promise<void> {
        const { nodeRuntimeMap, workflowId } = this.engine.ctx;

        const instances = new Set([...nodeRuntimeMap.values()].map(({ instance }) => instance));

        await Promise.allSettled([...instances].map(async (instance) => {
            try {
                const result = await bounded(instance.workflowEnding(outcome), HOOK_TIMEOUT_MS);

                if (result === 'timeout')
                    console.error(`[Lifecycle] Ending hook timed out after ${HOOK_TIMEOUT_MS}ms in workflow ${workflowId}`);
            }
            catch (error) {
                console.error(`[Lifecycle] Ending hook failed in workflow ${workflowId}:`, error);
            }
        }));
    }
}
