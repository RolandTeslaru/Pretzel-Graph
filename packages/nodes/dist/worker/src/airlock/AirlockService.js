"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirlockService = void 0;
const isolated_vm_1 = __importDefault(require("isolated-vm"));
const typescript_1 = __importDefault(require("typescript"));
const domain_1 = require("../../../shared/domain");
const AirlockScope_1 = require("./AirlockScope");
const LazyInput_1 = require("./LazyInput");
const errors_1 = require("./errors");
const TRANSPILE_OPTIONS = {
    compilerOptions: { target: typescript_1.default.ScriptTarget.ESNext, module: typescript_1.default.ModuleKind.None },
    reportDiagnostics: true,
};
const DEFAULT_MEMORY_LIMIT_MB = 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
// Owns one ivm.Isolate for the whole execution (the tenant/security boundary). Created in
// worker.ts and shared by reference, so subworkflows reuse the same isolate + caches.
class AirlockService {
    isolate;
    timeoutMs;
    workflowCopies = new Map();
    scripts = new Map();
    // Syntactic-only TS→JS strip, keyed on raw source — paid once per unique expression/code
    // string even when the same field is re-evaluated per item (mapItems hot loop).
    stripped = new Map();
    constructor(options = {}) {
        this.isolate = new isolated_vm_1.default.Isolate({ memoryLimit: options.memoryLimitMb ?? DEFAULT_MEMORY_LIMIT_MB });
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    }
    get isDisposed() {
        return this.isolate.isDisposed;
    }
    registerWorkflow(workflowId, data) {
        if (this.workflowCopies.has(workflowId))
            return;
        const view = domain_1.Airlock.toWorkflowView(workflowId, data);
        this.workflowCopies.set(workflowId, new isolated_vm_1.default.ExternalCopy(view));
    }
    // V8-compile + cache. Returns the runnable Script.
    cache(parsed) {
        let script = this.scripts.get(parsed);
        if (!script) {
            script = this.isolate.compileScriptSync(parsed);
            this.scripts.set(parsed, script);
        }
        return script;
    }
    compileExpression(expr, coerceTo) {
        const stripped = domain_1.Airlock.Source.asExpression(this.stripTypes(expr));
        return this.cache(domain_1.Airlock.parseExpression(stripped, coerceTo));
    }
    compileCode(code) {
        const stripped = domain_1.Airlock.Source.asCode(this.stripTypes(code));
        return this.cache(domain_1.Airlock.parseCode(stripped));
    }
    // Editor accepts TypeScript syntax (type annotations, `as` casts, etc.) for autocomplete/
    // typechecking, but nothing downstream of this runs it through tsc — isolated-vm compiles
    // plain V8 scripts. Strip types syntactically (no type-checker, no Program) before handing
    // off to the sigil rewrite + isolate compile.
    stripTypes(source) {
        let out = this.stripped.get(source);
        if (out === undefined) {
            const { outputText, diagnostics } = typescript_1.default.transpileModule(source, TRANSPILE_OPTIONS);
            if (diagnostics?.length)
                throw new errors_1.AirlockError(`Invalid expression: ${typescript_1.default.flattenDiagnosticMessageText(diagnostics[0].messageText, " ")}`);
            out = outputText.trim();
            this.stripped.set(source, out);
        }
        return out;
    }
    // One Context per env; injects the shared workflow copy + per-scope globals once.
    createScope(workflowId, perScope) {
        const wfCopy = this.workflowCopies.get(workflowId);
        if (!wfCopy)
            throw new errors_1.AirlockError(`Workflow "${workflowId}" not registered before createScope`);
        const context = this.isolate.createContextSync();
        const global = context.global;
        (0, LazyInput_1.installLazyBootstrap)(context);
        // Execution-scoped mutable scratch ($globals / $nodeGlobals). Set once, never cleared,
        // survives across re-fires, dies with the isolate at execution end.
        global.setSync(domain_1.Airlock.Globals.GLOBALS, {}, { copy: true });
        // Per-env metric scratch ($metrics) — author-written rollups, read back at the sub-run boundary.
        global.setSync(domain_1.Airlock.Globals.METRICS, {}, { copy: true });
        global.setSync(domain_1.Airlock.Globals.WORKFLOW, wfCopy.copyInto());
        global.setSync(domain_1.Airlock.Globals.IGNITER, perScope.igniter, { copy: true });
        return new AirlockScope_1.AirlockScope(this, context, this.timeoutMs);
    }
    dispose() {
        if (!this.isolate.isDisposed)
            this.isolate.dispose();
    }
}
exports.AirlockService = AirlockService;
