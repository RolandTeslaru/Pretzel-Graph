import type { RuntimeNode } from "@pretzel-graph/node-sdk";
import type { AggexEngine } from "./index";
import { bounded } from "../utils";
import { System } from "@pretzel-graph/shared/system";

const HOOK_TIMEOUT_MS = 10_000;

// Lets this engine's nodes finish what they hold once its workflow run ends.
export class LifecycleEffectService {

    private readonly log = System.log.withContext("Lifecycle");


    constructor(private readonly engine: AggexEngine) {}




    // Calls every node concurrently, each bounded; a failing node is logged, never thrown.
    public async runEnding(outcome: RuntimeNode.ExecutionOutcome): Promise<void> {
        const { nodeRuntimeMap, workflowId } = this.engine.ctx;

        const instances = new Set([...nodeRuntimeMap.values()].map(({ instance }) => instance));

        await Promise.allSettled([...instances].map(async (instance) => {
            try {
                const result = await bounded(instance.workflowEnding(outcome), HOOK_TIMEOUT_MS);

                if (result === 'timeout')
                    this.log.error("ending hook timed out", { workflowId, ms: HOOK_TIMEOUT_MS });
            }
            catch (error) {
                this.log.error("ending hook failed", { workflowId, error });
            }
        }));
    }
}
