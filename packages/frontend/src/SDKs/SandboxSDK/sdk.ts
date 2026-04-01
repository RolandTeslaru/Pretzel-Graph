import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { SDK } from "@/SDKs/SDKManager"
import { BaseSDK } from "../Base"
import SandboxFrameComponent from "./components/SandboxFrame"

const SANDBOX_SRCDOC = `
<html><body><script>
  window.addEventListener('message', function(e) {
    var id = e.data.id;
    var code = e.data.code;
    try {
      var result = new Function(code)();
      window.parent.postMessage({ id: id, result: result }, '*');
    } catch (err) {
      window.parent.postMessage({ id: id, error: err.message }, '*');
    }
  });
</script></body></html>
`

@SDK("Sandbox")
class SandboxSDKImpl extends BaseSDK<SandboxSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<SandboxSDK.State> = create(
        immer<SandboxSDK.State>(() => ({
            ready: false,
        }))
    )

    public readonly SandboxFrame = SandboxFrameComponent

    public readonly srcdoc = SANDBOX_SRCDOC

    private iframe: HTMLIFrameElement | null = null
    private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
    private messageListenerAttached = false

    public readonly reducers = {
        setReady: (ready: boolean) => {
            this.useStore.setState(s => { s.ready = ready })
        },
        setIframe: (el: HTMLIFrameElement) => {
            this.iframe = el
            if (!this.messageListenerAttached) {
                this.messageListenerAttached = true
                window.addEventListener('message', (e) => {
                    const { id, result, error } = e.data ?? {}
                    if (!id) return
                    const p = this.pending.get(id)
                    if (!p) return
                    this.pending.delete(id)
                    if (error) p.reject(new Error(error))
                    else p.resolve(result)
                })
            }
            this.reducers.setReady(true)
        },
    }

    public readonly actions = {}

    public run(code: string, timeoutMs = 5000): Promise<unknown> {
        if (!this.iframe) return Promise.reject(new Error('[SandboxSDK] iframe not mounted'))

        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID()

            const timer = setTimeout(() => {
                this.pending.delete(id)
                reject(new Error('[SandboxSDK] execution timed out'))
            }, timeoutMs)

            this.pending.set(id, {
                resolve: (v) => { clearTimeout(timer); resolve(v) },
                reject: (e) => { clearTimeout(timer); reject(e) },
            })

            if (!this.iframe?.contentWindow)
                return reject(new Error('[SandboxSDK] iframe not mounted'))

            try {
                this.iframe.contentWindow.postMessage({ id, code }, '*')
            } catch (err) {
                this.pending.delete(id)
                clearTimeout(timer)
                reject(err)
            }
        })
    }
}

export const SandboxSDK = SDK.get<SandboxSDKImpl>("Sandbox")

export namespace SandboxSDK {
    export type State = {
        ready: boolean
    }
}
