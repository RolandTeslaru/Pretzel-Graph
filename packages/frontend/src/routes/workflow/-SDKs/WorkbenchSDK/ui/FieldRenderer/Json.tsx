import { memo, useEffect, useState } from 'react'
import { Textarea } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

const formatJson = (value: unknown) => JSON.stringify(value, null, 2) ?? 'null'

export const JsonField = memo<RendererProps<'Json'>>(({ field, nodeId, className }) => {
    const [value, onChange, flush, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field)
    const formattedValue = formatJson(value ?? field.initialValue)
    const [draft, setDraft] = useState(() => formattedValue)
    const [parseError, setParseError] = useState<string | null>(null)

    useEffect(() => {
        setDraft(formattedValue)
        setParseError(null)
    }, [formattedValue])

    const innerClassName = (issue || parseError)
        ? 'border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50 font-mono font-semibold text-xs'
        : 'font-mono font-semibold text-xs'

    return (
        <div className={`${className ?? ''} w-full nodrag cursor-auto flex flex-col gap-1`}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Textarea
                size="sm"
                value={draft}
                onChange={(e) => {
                    const nextDraft = e.target.value
                    setDraft(nextDraft)

                    try {
                        const nextValue = JSON.parse(nextDraft)
                        setParseError(null)
                        onChange(nextValue)
                    } catch (error) {
                        setParseError(error instanceof Error ? error.message : 'Invalid JSON')
                    }
                }}
                onBlur={flush}
                className={innerClassName}
                rows={10}
                spellCheck={false}
            />
            {parseError && (
                <div className="text-[10px] text-destructive">{parseError}</div>
            )}
        </div>
    )
})

JsonField.displayName = "JsonField"
