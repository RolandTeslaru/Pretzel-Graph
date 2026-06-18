import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { Airlock, Expression, type Workflow } from "@pretzel-graph/shared/domain"
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

    // Globals keyed by the names the Airlock rewrite emits. $igniter / $chatId are
    // runtime-only → present-but-undefined so referencing them previews as undefined, not a ReferenceError.
    private buildGlobals(nodeId: Workflow.Node.Id): Record<string, unknown> {
        const ws = WorkbenchSDK.state
        const session = ExecutionSDK.state.currentExecution?.session
        return {
            [Airlock.GLOBALS.workflow]: Expression.toWorkflowView(ws.workflowId, ws.data),
            [Airlock.GLOBALS.in]: executionSelectors.getNodeIncomingData(ws, nodeId, session) ?? {},
            [Airlock.GLOBALS.nodeId]: nodeId,
            [Airlock.GLOBALS.igniter]: undefined,
            [Airlock.GLOBALS.chatId]: undefined,
        }
    }

    // Synchronous, main-thread. Pure expressions only → ~zero hang risk, instant per-keystroke.
    public previewExpression(
        expr: Airlock.Source.Expression, 
        nodeId: Workflow.Node.Id, 
        coerceTo?: Airlock.CoerceTo
    ): AirlockSDK.Result {
        if (!expr?.trim()) return { ok: true, value: undefined }
        try {
            const parsed = Airlock.parseExpression(Airlock.Source.asExpression(expr), coerceTo)
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
    public runCode(
        code: Airlock.Source.Code, 
        nodeId: Workflow.Node.Id
    ): Promise<AirlockSDK.Result> {
        return new Promise((resolve) => {
            let parsed: string
            let globals: Record<string, unknown>
            try {
                parsed = Airlock.parseCode(Airlock.Source.asCode(code))
                globals = this.buildGlobals(nodeId)
            } catch (err) {
                return resolve({ ok: false, error: err instanceof Error ? err.message : String(err) })
            }

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
