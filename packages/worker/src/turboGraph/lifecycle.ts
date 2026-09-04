import type { Execution } from "@pretzel-graph/shared/domain";
import type { RuntimeNode } from "@pretzel-graph/node-sdk";

type Hook = (outcome: RuntimeNode.ExecutionOutcome) => void | Promise<void>;

const HOOK_TIMEOUT_MS = 10_000;

// Per-execution hooks for the moment a run is ending. Keyed by execution so a sub-workflow's
// context registers into the same run as its parent.
class LifecycleService {

    readonly #hooks = new Map<Execution.Id, Set<Hook>>();

    public createAPI(executionId: Execution.Id): RuntimeNode.ExecutionContext["lifecycleAPI"] {
        return {
            onEnding: (hook) => {
                const hooks = this.#hooks.get(executionId) ?? new Set<Hook>();

                hooks.add(hook);
                this.#hooks.set(executionId, hooks);

                return () => { hooks.delete(hook) };
            },
        };
    }

    /** Runs every hook in registration order. Never throws: a hook cannot change the outcome. */
    public async runEnding(executionId: Execution.Id, outcome: RuntimeNode.ExecutionOutcome): Promise<void> {
        const hooks = this.#hooks.get(executionId);

        if (!hooks)
            return;

        for (const hook of [...hooks]) {
            try {
                await Promise.race([
                    hook(outcome),
                    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`lifecycle hook timed out after ${HOOK_TIMEOUT_MS}ms`)), HOOK_TIMEOUT_MS).unref?.()),
                ]);
            }
            catch (error) {
                console.error(`[Lifecycle] onEnding hook failed for execution ${executionId}:`, error);
            }
        }
    }

    public clear(executionId: Execution.Id) {
        this.#hooks.delete(executionId);
    }
}

export const lifecycleService = new LifecycleService();
