import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { BeforeMount, EditorProps } from '@monaco-editor/react'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemSDK } from '@/SDKs/SystemSDK'

const LazyEditor = lazy(() => import('@monaco-editor/react'))

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
        if (!containerRef.current) return
        const root = createRoot(containerRef.current)
        rootRef.current = root
        return () => {
            root.unmount()
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
    const theme = SystemSDK.useStore(s => s.theme)

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 300)
        return () => clearTimeout(timer)
    }, [])

    if (!mounted) return loadingFallback

    return <MonacoMount {...props} theme={theme === "dark" ? "vs-dark" : "light"} />
}
