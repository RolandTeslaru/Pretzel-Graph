import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { BeforeMount, EditorProps } from '@monaco-editor/react'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemSDK } from '@pretzel-graph/standard-ui/SDKs/SystemSDK'

const LazyEditor = lazy(() => import('@monaco-editor/react'))

// Roots whose unmount is deferred (queued, not yet run) — keyed by container so a StrictMode
// dev-only mount→cleanup→mount probe (same container DOM node, re-runs synchronously before the
// queued microtask fires) can cancel the pending unmount and reuse the same root instead of
// calling createRoot() again on a container that's still attached to a live root.
const pendingUnmounts = new WeakMap<HTMLElement, Root>()

const loadingFallback = (
    <div className="absolute inset-0 flex gap-4 items-center justify-center">
        <p className="text-sm font-medium text-primary-foreground animate-pulse">
            Loading Editor
        </p>
        <Spinner />
    </div>
)

interface MonacoEditorProps {
    height?: string
    defaultLanguage: string
    defaultValue: string
    onChange: (val: string) => void
    beforeMount?: BeforeMount
    options?: EditorProps['options']
    className?: string
}

// @monaco-editor/react's mount effect isn't safe under StrictMode's dev-only
// mount->cleanup->mount probe (the second create races a half-disposed editor
// instance and throws "t.create is not a function"). Mounting it into a manually
// created root sidesteps StrictMode for this subtree, since that root isn't a
// descendant of the app's <StrictMode> boundary.
const MonacoMount = ({ theme, height, defaultLanguage, defaultValue, onChange, beforeMount, options, className }: MonacoEditorProps & { theme: 'vs-dark' | 'light' }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const rootRef = useRef<Root | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // A StrictMode probe (or a fast close→reopen) can remount on the exact same container
        // before the previous cleanup's deferred unmount has actually run — reuse that root
        // instead of creating a second one on a container that's still attached to a live root.
        const pending = pendingUnmounts.get(container)
        const root = pending ?? createRoot(container)
        pendingUnmounts.delete(container)
        rootRef.current = root

        return () => {
            // Deferred: this cleanup can itself run inside the outer tree's commit (e.g. the
            // dialog unmounting on close). Unmounting this nested root synchronously in that
            // case races with React's still-in-progress commit ("Attempted to synchronously
            // unmount a root while React was already rendering") — queue it for afterward instead.
            pendingUnmounts.set(container, root)
            queueMicrotask(() => {
                if (pendingUnmounts.get(container) === root) {
                    pendingUnmounts.delete(container)
                    root.unmount()
                }
            })
            rootRef.current = null
        }
    }, [])

    useEffect(() => {
        rootRef.current?.render(
            <Suspense fallback={loadingFallback}>
                <LazyEditor
                    height={height ?? "85vh"}
                    defaultLanguage={defaultLanguage}
                    theme={theme}
                    defaultValue={defaultValue}
                    beforeMount={beforeMount}
                    onChange={(val) => onChange(val || "")}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        padding: { top: 50 },
                        scrollBeyondLastLine: false,
                        ...options,
                    }}
                />
            </Suspense>
        )
    }, [theme, height, defaultLanguage, defaultValue, onChange, beforeMount, options])

    return <div ref={containerRef} className={(className ?? "absolute inset-0" ) + `
        [&_.monaco-editor]:bg-transparent! [&_.monaco-editor-background]:bg-transparent! [&_.monaco-editor_.margin]:bg-transparent!
        [&_.sticky-widget]:bg-transparent! [&_.sticky-widget]:shadow-none! [&_.sticky-widget-line-numbers]:bg-transparent! [&_.sticky-widget-line-numbers]:shadow-none! [&_.sticky-line-content]:bg-transparent! [&_.sticky-line-number]:bg-transparent! [&_.sticky-line-number-inner]:bg-transparent!
        [&_.scroll-decoration]:shadow-none! [&_.scroll-decoration]:hidden!

    `} />
}

export const MonacoEditor = (props: MonacoEditorProps) => {
    const [mounted, setMounted] = useState(false)
    const theme = SystemSDK.useStore(s => s.resolvedTheme)

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 300)
        return () => clearTimeout(timer)
    }, [])

    if (!mounted) return loadingFallback

    return <MonacoMount {...props} theme={theme === "dark" ? "vs-dark" : "light"} />
}
