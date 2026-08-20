"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirlockScope = void 0;
const domain_1 = require("../../../shared/domain");
const LazyInput_1 = require("./LazyInput");
const errors_1 = require("./errors");
// Persistent scope globals — set once at creation, never transiently.
const RESERVED_GLOBALS = new Set([
    domain_1.Airlock.Globals.WORKFLOW,
    domain_1.Airlock.Globals.IGNITER,
    domain_1.Airlock.Globals.GLOBALS,
    domain_1.Airlock.Globals.METRICS,
]);
// Large, bound-once globals routed through the lazy bridge instead of copy:true. `$item` stays
// copied — it's per-element in a hot loop where per-iteration bridge-install would regress.
const LAZY_GLOBALS = new Set([domain_1.Airlock.Globals.IN]);
// One ivm.Context per env, reused across re-fires. Shares the service's isolate + cache via `compiler`.
class AirlockScope {
    service;
    context;
    timeoutMs;
    constructor(service, context, timeoutMs) {
        this.service = service;
        this.context = context;
        this.timeoutMs = timeoutMs;
    }
    // set→run→clear is one sync block → atomic, so re-fired/concurrent nodes can't clobber globals.
    executeSync(globals, run) {
        const g = this.context.global;
        // Every copied key touched during the block (initial + transient rebinds) — cleared on exit.
        const touched = new Set();
        // Lazy-bound globals (host-backed proxies) — released on exit / before re-bind.
        const lazyBindings = new Map();
        const setGlobals = (next) => {
            for (const [name, value] of Object.entries(next)) {
                if (RESERVED_GLOBALS.has(name))
                    throw new errors_1.AirlockError(`"${name}" is a reserved persistent global and cannot be set transiently`);
                if (LAZY_GLOBALS.has(name)) {
                    lazyBindings.get(name)?.release();
                    lazyBindings.set(name, (0, LazyInput_1.bindLazyGlobal)(this.context, name, value));
                }
                else {
                    g.setSync(name, value, { copy: true });
                    touched.add(name);
                }
            }
        };
        setGlobals(globals);
        try {
            return run((expr, coerceTo) => this.runScript(this.service.compileExpression(expr, coerceTo)), setGlobals);
        }
        finally {
            if (!this.service.isDisposed)
                for (const name of touched)
                    g.deleteSync(name);
            for (const binding of lazyBindings.values())
                binding.release();
        }
    }
    // @in / @node id are fn params (per-call), not globals → re-fires can't clobber them.
    async executeAsyncCode(code, nodeId, incoming) {
        const script = this.service.compileCode(code);
        let fn;
        try {
            fn = script.runSync(this.context, { reference: true });
            return await fn.apply(undefined, [incoming, nodeId], {
                arguments: { copy: true },
                result: { copy: true, promise: true },
                timeout: this.timeoutMs,
            });
        }
        catch (err) {
            if (this.service.isDisposed)
                throw new errors_1.AirlockTerminationError();
            throw err instanceof Error ? err : new errors_1.AirlockError(String(err), err);
        }
        finally {
            fn?.release();
        }
    }
    // Deep-copy a persistent global out to the host. Returns undefined if the isolate is gone.
    readGlobal(name) {
        if (this.service.isDisposed)
            return undefined;
        try {
            return this.context.global.getSync(name, { copy: true });
        }
        catch {
            return undefined;
        }
    }
    runScript(script) {
        try {
            return script.runSync(this.context, { timeout: this.timeoutMs, copy: true });
        }
        catch (err) {
            if (this.service.isDisposed)
                throw new errors_1.AirlockTerminationError();
            throw err instanceof Error ? err : new errors_1.AirlockError(String(err), err);
        }
    }
}
exports.AirlockScope = AirlockScope;
