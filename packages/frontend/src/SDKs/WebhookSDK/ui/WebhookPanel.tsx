import { useState } from "react"
import { Button, Input, Textarea, Select, Badge, ScrollArea } from "@pretzel-graph/standard-ui/foundations"
import { WebhookSDK } from "../sdk"
import type { WebhookSDK as WebhookSDKNS } from "../sdk"
import { Webhook } from "@pretzel-graph/shared/domain/Webhook"
import { cn } from "@pretzel-graph/standard-ui/utils/cn"

const METHODS = Webhook.Method.options

function statusColor(status: WebhookSDKNS.Entry["status"], code?: number) {
    if (status === "pending") return "secondary"
    if (status === "error" || (code && code >= 400)) return "destructive"
    return "success"
}

function EntryRow({ entry, onRemove }: { entry: WebhookSDKNS.Entry; onRemove: () => void }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="border border-border rounded-md overflow-hidden text-xs">
            <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                onClick={() => setOpen(o => !o)}
            >
                <Badge variant={statusColor(entry.status, entry.responseStatus)} className="shrink-0 text-[10px] font-mono">
                    {entry.method}
                </Badge>
                <span className="font-mono text-muted-foreground truncate flex-1">{entry.url}</span>
                {entry.responseStatus && (
                    <span className={cn(
                        "font-mono shrink-0",
                        entry.responseStatus >= 400 ? "text-destructive" : "text-success"
                    )}>
                        {entry.responseStatus}
                    </span>
                )}
                {entry.durationMs !== undefined && (
                    <span className="text-muted-foreground shrink-0">{entry.durationMs}ms</span>
                )}
                {entry.status === "pending" && (
                    <span className="text-muted-foreground shrink-0 animate-pulse">...</span>
                )}
                <button
                    className="text-muted-foreground hover:text-destructive shrink-0 ml-1"
                    onClick={(e) => { e.stopPropagation(); onRemove() }}
                >
                    ✕
                </button>
            </button>

            {open && (
                <div className="border-t border-border px-3 py-2 space-y-2 bg-muted/20">
                    {Object.keys(entry.headers).length > 0 && (
                        <div>
                            <p className="text-muted-foreground mb-1">Request Headers</p>
                            <pre className="font-mono whitespace-pre-wrap break-all text-[11px]">
                                {JSON.stringify(entry.headers, null, 2)}
                            </pre>
                        </div>
                    )}
                    {entry.body && (
                        <div>
                            <p className="text-muted-foreground mb-1">Request Body</p>
                            <pre className="font-mono whitespace-pre-wrap break-all text-[11px]">{entry.body}</pre>
                        </div>
                    )}
                    {entry.responseBody !== undefined && (
                        <div>
                            <p className="text-muted-foreground mb-1">Response</p>
                            <pre className="font-mono whitespace-pre-wrap break-all text-[11px]">{entry.responseBody}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export function WebhookPanel() {
    const entries = WebhookSDK.useStore(s => s.entries)
    const baseUrl = WebhookSDK.useStore(s => s.baseUrl)

    const [method, setMethod] = useState<Webhook.Method>("POST")
    const [path, setPath] = useState("")
    const [body, setBody] = useState("")
    const [headersRaw, setHeadersRaw] = useState("")

    const fire = () => {
        let headers: Record<string, string> = {}
        try { headers = headersRaw ? JSON.parse(headersRaw) : {} } catch { /* ignore malformed */ }

        WebhookSDK.actions.fire({ method, path, body: body || undefined, headers })
    }

    return (
        <div className="flex flex-col gap-3 p-3 h-full">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Base URL</span>
                <Input
                    className="font-mono text-xs h-7"
                    value={baseUrl}
                    onChange={e => WebhookSDK.reducers.setBaseUrl(e.currentTarget.value)}
                    placeholder="http://localhost:3001/webhook"
                />
            </div>

            <div className="flex gap-2">
                <Select.Root value={method} onValueChange={v => setMethod(v as Webhook.Method)}>
                    <Select.Trigger className="w-28 h-8 text-xs font-mono">
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                        {METHODS.map(m => (
                            <Select.Item key={m} value={m} className="text-xs font-mono">{m}</Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>

                <Input
                    className="font-mono text-xs h-8 flex-1"
                    value={path}
                    onChange={e => setPath(e.currentTarget.value)}
                    placeholder="/my-path"
                    onKeyDown={e => e.key === "Enter" && fire()}
                />

                <Button className="h-8 text-xs shrink-0" onClick={fire}>
                    Send
                </Button>
            </div>

            <Textarea
                className="font-mono text-xs resize-none h-20"
                value={body}
                onChange={e => setBody(e.currentTarget.value)}
                placeholder='{"key": "value"}'
            />

            <Textarea
                className="font-mono text-xs resize-none h-14"
                value={headersRaw}
                onChange={e => setHeadersRaw(e.currentTarget.value)}
                placeholder='{"X-Custom-Header": "value"} (JSON)'
            />

            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{entries.length} request{entries.length !== 1 ? "s" : ""}</span>
                {entries.length > 0 && (
                    <Button variant="ghost" className="h-6 text-xs" onClick={WebhookSDK.reducers.clear}>
                        Clear
                    </Button>
                )}
            </div>

            <ScrollArea.Root className="flex-1 min-h-0">
                <div className="flex flex-col gap-1.5 pr-1">
                    {entries.map(entry => (
                        <EntryRow
                            key={entry.id}
                            entry={entry}
                            onRemove={() => WebhookSDK.reducers.removeEntry(entry.id)}
                        />
                    ))}
                    {entries.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-6">No requests yet</p>
                    )}
                </div>
            </ScrollArea.Root>
        </div>
    )
}
