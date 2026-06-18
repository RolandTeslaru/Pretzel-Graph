// Off-main-thread sandbox for code-mode Airlock previews. No imports: globals are
// assigned onto `self`, the parsed async fn is eval'd in global scope and called
// with [$in, nodeId]. A hung run is killed by the SDK via worker.terminate().

self.onmessage = async (e: MessageEvent) => {
    const { id, parsed, globals, args } = e.data
    try {
        Object.assign(self, globals)
        const fn = (0, eval)(parsed)
        const result = await fn(...args)
        try {
            self.postMessage({ id, result })
        } catch {
            self.postMessage({ id, result: JSON.parse(JSON.stringify(result ?? null)) })
        }
    } catch (err) {
        self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
    }
}
