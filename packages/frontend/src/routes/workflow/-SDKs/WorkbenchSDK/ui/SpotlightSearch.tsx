import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { WorkbenchSDK } from "../sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { IconRenderer } from "@pretzel-graph/standard-ui/icons/IconRenderer"
import type { Workflow } from "@pretzel-graph/shared/domain"

interface SearchResult {
    nodeId: Workflow.Node.Id
    displayName: string
    blueprintId: string
    icon: string
    accent: string | undefined
}

const NODE_ZOOM = 1.2
const ANIMATION_DURATION = 400

const SpotlightSearch: React.FC = memo(() => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Toggle on Cmd/Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                setOpen(prev => {
                    if (!prev) {
                        setQuery("")
                        setSelectedIndex(0)
                    }
                    return !prev
                })
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Auto-focus input when opened
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => inputRef.current?.focus())
        }
    }, [open])

    const nodes = WorkbenchSDK.useStore(s => s.data.nodes)

    const results: SearchResult[] = useMemo(() => {
        if (!query.trim()) return []
        const q = query.toLowerCase()
        return Object.values(nodes)
            .map(node => ({ node, ui: WorkbenchSDK.state.selectors.node.getUI(WorkbenchSDK.state, node.id) }))
            .filter(({ node, ui }) =>
                ui.displayName.toLowerCase().includes(q) ||
                node.id.toLowerCase().includes(q)
            )
            .map(({ node, ui }) => ({
                nodeId: node.id,
                displayName: ui.displayName,
                blueprintId: node.blueprintId,
                icon: ui.icon ?? "",
                accent: ui.accent,
            }))
    }, [nodes, query])

    // Clamp selected index
    useEffect(() => {
        if (selectedIndex >= results.length) {
            setSelectedIndex(Math.max(0, results.length - 1))
        }
    }, [results.length, selectedIndex])

    const navigateToNode = useCallback((nodeId: Workflow.Node.Id) => {
        const driver = WorkbenchSDK.runtime.canvasDriver
        if (!driver) return

        driver.fitView({
            nodes: [{ id: nodeId }],
            maxZoom: NODE_ZOOM,
            duration: ANIMATION_DURATION,
            padding: 0.5,
        })

        WorkbenchSDK.actions.setClickedNodeId(nodeId)
        setOpen(false)
    }, [])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex(i => Math.min(i + 1, results.length - 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex(i => Math.max(i - 1, 0))
        } else if (e.key === "Enter" && results[selectedIndex]) {
            e.preventDefault()
            navigateToNode(results[selectedIndex].nodeId)
        } else if (e.key === "Escape") {
            setOpen(false)
        }
    }, [results, selectedIndex, navigateToNode])

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current
        if (!list) return
        const selected = list.children[selectedIndex] as HTMLElement | undefined
        selected?.scrollIntoView({ block: "nearest" })
    }, [selectedIndex])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 dark:bg-black/60" />

            {/* Search panel */}
            <div
                className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[420px] rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Input row */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                    <SystemIcons.Search size={16} className="text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search nodes by name or ID..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded bg-muted px-1.5 text-[10px] font-mono text-muted-foreground border border-border">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                {query.trim() && (
                    <div ref={listRef} className="max-h-[280px] overflow-y-auto custom-scrollbar p-1">
                        {results.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No nodes found
                            </div>
                        ) : (
                            results.map((result, i) => (
                                <button
                                    key={result.nodeId}
                                    onClick={() => navigateToNode(result.nodeId)}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                                        i === selectedIndex
                                            ? "bg-primary/10 text-foreground"
                                            : "text-foreground/80 hover:bg-muted/50"
                                    }`}
                                >
                                    <IconRenderer
                                        name={result.icon}
                                        className="w-4 h-4 shrink-0"
                                        style={{ color: result.accent ? `var(--${result.accent}-foreground)` : undefined }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate font-medium">{result.displayName}</p>
                                        <p className="truncate text-xs text-muted-foreground">{result.nodeId}</p>
                                    </div>
                                    {i === selectedIndex && (
                                        <kbd className="hidden sm:inline-flex h-5 items-center rounded bg-muted px-1.5 text-[10px] font-mono text-muted-foreground border border-border shrink-0">
                                            ENTER
                                        </kbd>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* Footer hint */}
                <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground">
                    <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                            <kbd className="inline-flex h-4 items-center rounded bg-muted px-1 font-mono border border-border">
                                &uarr;
                            </kbd>
                            <kbd className="inline-flex h-4 items-center rounded bg-muted px-1 font-mono border border-border">
                                &darr;
                            </kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-0.5">
                            <kbd className="inline-flex h-4 items-center rounded bg-muted px-1 font-mono border border-border">
                                &crarr;
                            </kbd>
                            select
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
})

SpotlightSearch.displayName = "SpotlightSearch"

export default SpotlightSearch
