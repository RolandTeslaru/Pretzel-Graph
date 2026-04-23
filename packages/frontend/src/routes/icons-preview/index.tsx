import { createFileRoute } from '@tanstack/react-router'
import * as SystemIcons from '@pretzel-graph/standard-ui/icons/system'
import { useState } from 'react'

export const Route = createFileRoute('/icons-preview/')({
    component: IconsPreview,
})

const EXCLUDED = new Set(['PingingAlertTriangle'])

function IconsPreview() {
    const [copied, setCopied] = useState<string | null>(null)

    const icons = Object.entries(SystemIcons).filter(
        ([name]) => !EXCLUDED.has(name)
    ) as [string, React.FC<{ size?: number; className?: string }>][]

    function handleCopy(name: string) {
        navigator.clipboard.writeText(name)
        setCopied(name)
        setTimeout(() => setCopied(null), 1500)
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <h1 className="text-2xl font-semibold mb-2">System Icons</h1>
            <p className="text-muted-foreground text-sm mb-8">
                Click any icon to copy its component name.
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                {icons.map(([name, Icon]) => (
                    <button
                        key={name}
                        onClick={() => handleCopy(name)}
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 hover:bg-accent transition-colors cursor-pointer relative"
                        title={name}
                    >
                        <Icon size={20} />
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight">
                            {name}
                        </span>
                        {copied === name && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-accent text-xs font-medium text-accent-foreground">
                                Copied!
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
