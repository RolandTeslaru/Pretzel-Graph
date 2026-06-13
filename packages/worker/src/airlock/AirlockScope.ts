import ivm from "isolated-vm";
import { Airlock, Workflow } from "@pretzel-graph/shared/domain";

import type { AirlockService } from "./AirlockService";
import { AirlockError, AirlockTerminationError } from "./errors";

// Persistent scope globals — set once at creation, never transiently.
const RESERVED_GLOBALS: ReadonlySet<string> = new Set([
    Airlock.GLOBALS.workflow,
    Airlock.GLOBALS.igniter,
    Airlock.GLOBALS.chatId,
]);

// One ivm.Context per env, reused across re-fires. Shares the service's isolate + cache via `compiler`.
export class AirlockScope implements Airlock.API {
    constructor(
        private readonly service: AirlockService,
        private readonly context: ivm.Context,
        private readonly timeoutMs: number,
    ) {}

    // set→run→clear is one sync block → atomic, so re-fired/concurrent nodes can't clobber globals.
    public executeSync<T>(globals: Record<string, unknown>, run: (evaluate: Airlock.EvaluateFn) => T): T {
        const g = this.context.global;

        for (const [name, value] of Object.entries(globals)) {
            if (RESERVED_GLOBALS.has(name))
                throw new AirlockError(`"${name}" is a reserved persistent global and cannot be set transiently`);
            g.setSync(name, value, { copy: true });
        }

        
        try {
            return run((expr, coerceTo) => this.runScript(this.service.compileExpression(expr, coerceTo)));
        } finally {
            if (!this.service.isDisposed)
                for (const name of Object.keys(globals))
                    g.deleteSync(name);
        }
    }

    // @in / @node id are fn params (per-call), not globals → re-fires can't clobber them.
    public async executeAsyncCode(
        code: Airlock.Source.Code,
        nodeId: Workflow.Node.Id,
        incoming: unknown,
    ): Promise<unknown> {
        const script = this.service.compileCode(code);

        let fn: ivm.Reference | undefined;
        try {
            fn = script.runSync(this.context, { reference: true });
            return await fn.apply(undefined, [incoming, nodeId], {
                arguments: { copy: true },
                result: { copy: true, promise: true },
                timeout: this.timeoutMs,
            });
        } catch (err) {
            if (this.service.isDisposed)
                throw new AirlockTerminationError();
            throw err instanceof Error ? err : new AirlockError(String(err), err);
        } finally {
            fn?.release();
        }
    }

    private runScript(script: ivm.Script): unknown {
        try {
            return script.runSync(this.context, { timeout: this.timeoutMs, copy: true });
        } catch (err) {
            if (this.service.isDisposed)
                throw new AirlockTerminationError();
            throw err instanceof Error ? err : new AirlockError(String(err), err);
        }
    }
}
