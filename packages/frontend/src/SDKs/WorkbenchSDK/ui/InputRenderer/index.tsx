import { memo } from 'react'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { WorkbenchSDK } from '../../sdk'
import { Textarea } from '@/vx-ui/foundations'
import { HighlightedTextarea } from './HighlightedTextarea'
import { InputLabel } from './label';


type RendererProps<K extends Foundations.Port.Input['variant']> = {
    input: Extract<Foundations.Port.Input, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
    showTypeBadge?: boolean
}


// ── Variant Renderers ────────────────────────────────────────

const MessageInput = memo(({ input, nodeId, className, showTypeBadge }: RendererProps<'Message'>) => {
    const value = WorkbenchSDK.useStaticValue(nodeId, input);

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} showTypeBadges={showTypeBadge} />
            <HighlightedTextarea
                input={input}
                nodeId={nodeId}
                value={value}
                onChange={(e) => WorkbenchSDK.actions.input.setValue(nodeId, input.id, e.target.value)}
                placeholder={input.placeholder}
            />
        </div>
    )
})
MessageInput.displayName = "MessageInput"


const TextInput = memo(({ input, nodeId, className, showTypeBadge }: RendererProps<'Text'>) => {
    const value = WorkbenchSDK.useStaticValue(nodeId, input);

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} showTypeBadges={showTypeBadge}/>
            <Textarea
                value={value}
                onChange={(e) => WorkbenchSDK.actions.input.setValue(nodeId, input.id, e.target.value)}
                placeholder="Enter text..."
            />
        </div>
    )
})
TextInput.displayName = "TextInput"


/** Fallback for variants that can only receive via edge (LanguageModel, Document, etc.) */
const EdgeOnlyInput = memo(({ input, className, showTypeBadge }: { input: Foundations.Port.Input, className?: string, showTypeBadge?: boolean }) => {
    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} showTypeBadges={showTypeBadge} />
        </div>
    )
})
EdgeOnlyInput.displayName = "EdgeOnlyInput"


// ── Dispatcher ───────────────────────────────────────────────

type InputRendererMapType = {
    [K in Foundations.Port.Input['variant']]?:
    React.ComponentType<{
        input: Extract<Foundations.Port.Input, { variant: K }>
        nodeId: Workflow.Node.Id
        className?: string
        showTypeBadge?: boolean
    }>
}

export const INPUT_RENDERER_MAP: InputRendererMapType = {
    Message: MessageInput,
    Text: TextInput,
}

/** Renders the appropriate input component based on variant */
export const InputRenderer = memo(({ input, nodeId, className, hideInnerComponent = false, showTypeBadge = true }: {
    input: Foundations.Port.Input
    nodeId: Workflow.Node.Id
    className?: string
    hideInnerComponent?: boolean
    showTypeBadge?: boolean
}) => {
    const Component = INPUT_RENDERER_MAP[input.variant] as React.ComponentType<{
        input: Foundations.Port.Input
        nodeId: Workflow.Node.Id
        className?: string
        showTypeBadge?: boolean
    }> | undefined

    if (hideInnerComponent === true)
        return (
            <InputLabel input={input} showTypeBadges={false} />
        )

    if (Component)
        return <Component input={input} nodeId={nodeId} className={className} showTypeBadge={showTypeBadge} />

    return <EdgeOnlyInput input={input} className={className} showTypeBadge={showTypeBadge} />
})

