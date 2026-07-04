import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { Airlock, type Workflow } from "@pretzel-graph/shared/domain"
import { SDK } from "@/SDKs/SDKManager"
import { BaseSDK } from "@/SDKs/Base"
import { WorkbenchSDK } from "@/routes/workflow/-SDKs/WorkbenchSDK/sdk"
import { ExecutionSDK } from "@/routes/workflow/-SDKs/ExecutionSDK/sdk"
import { executionSelectors } from "@/routes/workflow/-SDKs/WorkbenchSDK/selectors/execution"

const RUN_TIMEOUT_MS = 5000

// Frontend Airlock preview. Same rewrite + WorkflowView as the worker → preview == runtime.
// No security boundary here (user's own code/data/session); the worker exists for a real,
// terminable deadline + a no-DOM global, not isolation.
@SDK("Airlock")
class AirlockSDKImpl extends BaseSDK<AirlockSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<AirlockSDK.State> = create(
        immer<AirlockSDK.State>(() => ({}))
    )

    public readonly reducers = {}
    public readonly actions = {}

    private worker: Worker | null = null
    private pending = new Map<string, (msg: { result?: unknown; error?: string }) => void>()

    // The editor accepts real TypeScript (type annotations, `as` casts, ...) for autocomplete,
    // but nothing downstream runs it through tsc — `new Function`/the isolate only understand
    // plain JS. sucrase is a tokenizer-based type-stripper (correctly resolves the `:`/`<`/`as`
    // ambiguity with ternaries, comparisons, and identifiers — unlike a naive regex), but tiny
    // and synchronous: no full type-checker/Program, no Monaco worker round-trip. It also
    // preserves the original source text verbatim apart from the stripped spans, so it won't
    // reformat/re-emit (e.g. add a stray trailing semicolon the way a real emitter would).
    // Lazy-loaded + cached: sucrase (~104KB gz) only enters the bundle the first time a preview
    // actually runs, instead of weighing down the initial app load for users who never open it.
    private transform: typeof import("sucrase").transform | null = null
    private async stripTypes(source: string): Promise<string> {
        if (!this.transform) {
            this.transform = (await import("sucrase")).transform
        }
        // disableESTransforms: sucrase's "typescript" preset also downlevels optional chaining /
        // nullish coalescing into inline helper functions by default — unnecessary here since both
        // the browser preview and isolated-vm support them natively. We only want type-stripping.
        return this.transform(source, { transforms: ["typescript"], disableESTransforms: true }).code
    }

    // Globals keyed by the names the Airlock rewrite emits. $igniter / $chatId are
    // runtime-only → present-but-undefined so referencing them previews as undefined, not a ReferenceError.
    private buildGlobals(nodeId: Workflow.Node.Id): Record<string, unknown> {
        const ws = WorkbenchSDK.state
        const session = ExecutionSDK.state.currentExecution?.session
        const incoming = executionSelectors.getNodeIncomingData(ws, nodeId, session) ?? {}

        // For item-scoped fields, preview $item against a representative element: the first item of
        // the single incoming array (matching getItemType's autocomplete inference). When ambiguous,
        // $item / $itemIndex stay present-but-undefined → preview as undefined, never a ReferenceError.
        const arrays = Object.values(incoming).filter(Array.isArray) as unknown[][]
        const sampleItem = arrays.length === 1 && arrays[0].length > 0 ? arrays[0][0] : undefined

        return {
            [Airlock.GLOBALS.workflow]: Airlock.toWorkflowView(ws.workflowId, ws.data),
            [Airlock.GLOBALS.in]: incoming,
            [Airlock.GLOBALS.item]: sampleItem,
            [Airlock.GLOBALS.itemIndex]: sampleItem !== undefined ? 0 : undefined,
            [Airlock.GLOBALS.nodeId]: nodeId,
            [Airlock.GLOBALS.igniter]: undefined,
            [Airlock.GLOBALS.chatId]: undefined,
            // Execution-scoped scratch ($globals / $nodeGlobals). Fresh per preview — side effects
            // don't persist across keystrokes, which is the right preview semantic.
            [Airlock.GLOBALS.globals]: {},
        }
    }

    // Main-thread, pure expressions only → ~zero hang risk. Async only to lazy-load the type-stripper
    // on first use; once cached it's effectively instant per-keystroke.
    public async previewExpression(
        expr: Airlock.Source.Expression,
        nodeId: Workflow.Node.Id,
        coerceTo?: Airlock.CoerceTo
    ): Promise<AirlockSDK.Result> {
        if (!expr?.trim()) return { ok: true, value: undefined }
        try {
            const stripped = Airlock.Source.asExpression(await this.stripTypes(expr))
            const parsed = Airlock.parseExpression(stripped, coerceTo)
            const g = this.buildGlobals(nodeId)
            const keys = Object.keys(g)
            // eslint-disable-next-line no-new-func
            const fn = new Function(...keys, `return ${parsed}`)
            return { ok: true, value: fn(...keys.map((k) => g[k])) }
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) }
        }
    }

    // Async, off-thread. Arbitrary code → real terminate() deadline; a hung run can't freeze the UI.
    public async runCode(
        code: Airlock.Source.Code,
        nodeId: Workflow.Node.Id
    ): Promise<AirlockSDK.Result> {
        let parsed: string
        let globals: Record<string, unknown>
        try {
            const stripped = Airlock.Source.asCode(await this.stripTypes(code))
            parsed = Airlock.parseCode(stripped)
            globals = this.buildGlobals(nodeId)
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) }
        }

        return new Promise((resolve) => {
            const worker = this.ensureWorker()
            const id = crypto.randomUUID()
            const timer = setTimeout(() => {
                this.pending.delete(id)
                this.disposeWorker() // kill the hung isolate; recreated lazily on next run
                resolve({ ok: false, error: `Execution timed out after ${RUN_TIMEOUT_MS}ms` })
            }, RUN_TIMEOUT_MS)

            this.pending.set(id, (msg) => {
                clearTimeout(timer)
                if (msg.error !== undefined) resolve({ ok: false, error: msg.error })
                else resolve({ ok: true, value: msg.result })
            })

            worker.postMessage({ id, parsed, globals, args: [globals[Airlock.GLOBALS.in], nodeId] })
        })
    }

    private ensureWorker(): Worker {
        if (this.worker) return this.worker
        const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })
        worker.onmessage = (e: MessageEvent) => {
            const { id, result, error } = e.data ?? {}
            const done = this.pending.get(id)
            if (!done) return
            this.pending.delete(id)
            done({ result, error })
        }
        this.worker = worker
        return worker
    }

    private disposeWorker() {
        this.worker?.terminate()
        this.worker = null
    }

    public dispose() {
        this.disposeWorker()
        this.pending.clear()
    }
}

export const AirlockSDK = SDK.get<AirlockSDKImpl>("Airlock")

export namespace AirlockSDK {
    export type State = Record<string, never>
    export type Result =
        | { ok: true; value: unknown }
        | { ok: false; error: string }
}
