import ivm from "isolated-vm";
import { Airlock, Chat, Execution, Expression, Workflow } from "@pretzel-graph/shared/domain";

import { AirlockScope } from "./AirlockScope";
import { AirlockError } from "./errors";

const DEFAULT_MEMORY_LIMIT_MB = 1024;
const DEFAULT_TIMEOUT_MS = 5_000;

export namespace AirlockService {
    export interface Options {
        memoryLimitMb?: number;
        timeoutMs?: number;
    }
}

// Owns one ivm.Isolate for the whole execution (the tenant/security boundary). Created in
// worker.ts and shared by reference, so subworkflows reuse the same isolate + caches.
export class AirlockService {
    private readonly isolate: ivm.Isolate;
    private readonly timeoutMs: number;

    private readonly workflowCopies = new Map<Workflow.Id, ivm.ExternalCopy<Expression.WorkflowView>>();
    private readonly scripts = new Map<Airlock.ParsedSource, ivm.Script>();

    constructor(options: AirlockService.Options = {}) {
        this.isolate = new ivm.Isolate({ memoryLimit: options.memoryLimitMb ?? DEFAULT_MEMORY_LIMIT_MB });
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    }

    get isDisposed(): boolean {
        return this.isolate.isDisposed;
    }

    public registerWorkflow(workflowId: Workflow.Id, data: Workflow.Data): void {
        if (this.workflowCopies.has(workflowId))
            return;

        const view = Expression.toWorkflowView(workflowId, data);
        this.workflowCopies.set(workflowId, new ivm.ExternalCopy(view));
    }

    // V8-compile + cache. Returns the runnable Script.
    private cache(parsed: Airlock.ParsedSource): ivm.Script {
        let script = this.scripts.get(parsed);
        if (!script) {
            script = this.isolate.compileScriptSync(parsed);
            this.scripts.set(parsed, script);
        }
        return script;
    }

    public compileExpression(expr: Airlock.Source.Expression, coerceTo?: Airlock.CoerceTo): ivm.Script {
        return this.cache(Airlock.parseExpression(expr, coerceTo));
    }

    public compileCode(code: Airlock.Source.Code): ivm.Script {
        return this.cache(Airlock.parseCode(code));
    }

    // One Context per env; injects the shared workflow copy + per-scope globals once.
    public createScope(
        workflowId: Workflow.Id,
        perScope: { igniter: Execution.Igniter; chatId?: Chat.Id },
    ): AirlockScope {
        const wfCopy = this.workflowCopies.get(workflowId);
        if (!wfCopy)
            throw new AirlockError(`Workflow "${workflowId}" not registered before createScope`);

        const context = this.isolate.createContextSync();
        const global = context.global;

        global.setSync(Airlock.GLOBALS.workflow, wfCopy.copyInto());
        global.setSync(Airlock.GLOBALS.igniter, perScope.igniter, { copy: true });
        if (perScope.chatId !== undefined)
            global.setSync(Airlock.GLOBALS.chatId, perScope.chatId, { copy: true });

        return new AirlockScope(this, context, this.timeoutMs);
    }

    public dispose(): void {
        if (!this.isolate.isDisposed) this.isolate.dispose();
    }
}
