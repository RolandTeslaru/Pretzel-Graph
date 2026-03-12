import { memo } from 'react'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { WorkbenchSDK } from '../../sdk'
import { Textarea } from '@/vx-ui/foundations'
import { HighlightedTextarea } from './HighlightedTextarea'
import { InputLabel } from './label';
import { SystemIcons } from '@/vx-ui/icons';


type RendererProps<K extends Foundations.Port.Input['variant']> = {
    input: Extract<Foundations.Port.Input, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
    showTypeBadge?: boolean
    isFlipped?: boolean
}


// ── Variant Renderers ────────────────────────────────────────

const MessageInput = memo(({ input, nodeId, className, showTypeBadge, isFlipped }: RendererProps<'Message'>) => {
    const [value, issue] = WorkbenchSDK.useInput(nodeId, input.id);

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} showTypeBadges={showTypeBadge} isFlipped={isFlipped} />
            <HighlightedTextarea
                input={input}
                nodeId={nodeId}
                value={value as string}
                onChange={e => WorkbenchSDK.actions.input.setValue(nodeId, input, e.target.value)}
                placeholder={input.placeholder}
                className={issue ? "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50" : ""}
            />
        </div>
    )
})
MessageInput.displayName = "MessageInput"


const TextInput = memo(({ input, nodeId, className, showTypeBadge, isFlipped }: RendererProps<'Text'>) => {
    const [value, issue] = WorkbenchSDK.useInput(nodeId, input.id);

    let innerClassName = ""
    if(issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} showTypeBadges={showTypeBadge} isFlipped={isFlipped} />
            <Textarea
                value={value as string}
                onChange={(e) => WorkbenchSDK.actions.input.setValue(nodeId, input, e.target.value)}
                placeholder="Enter text..."
                className={innerClassName}
            />
        </div>
    )
})
TextInput.displayName = "TextInput"


/** Fallback for variants that can only receive via edge (LanguageModel, Document, etc.) */
const EdgeOnlyInput = memo(({ input, nodeId, className, showTypeBadge, isFlipped }: { input: Foundations.Port.Input, nodeId: Workflow.Node.Id, className?: string, showTypeBadge?: boolean, isFlipped?: boolean }) => {
    const issue = WorkbenchSDK.useStore(s =>
        s.issues[nodeId]?.inputs[input.id] ?? null
    )


    return (
        <div className={className + " w-full flex flex-col relative gap-1 "}>
            <InputLabel input={input} showTypeBadges={showTypeBadge} isFlipped={isFlipped} />
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
        isFlipped?: boolean
    }>
}

export const INPUT_RENDERER_MAP: InputRendererMapType = {
    Message: MessageInput,
    Text: TextInput,
}

/** Renders the appropriate input component based on variant */
export const InputRenderer = memo(({ input, nodeId, className, hideInnerComponent = false, showTypeBadge = true, isFlipped }: {
    input: Foundations.Port.Input
    nodeId: Workflow.Node.Id
    className?: string
    hideInnerComponent?: boolean
    showTypeBadge?: boolean
    isFlipped?: boolean
}) => {
    const Component = INPUT_RENDERER_MAP[input.variant] as React.ComponentType<{
        input: Foundations.Port.Input
        nodeId: Workflow.Node.Id
        className?: string
        showTypeBadge?: boolean
        isFlipped?: boolean
    }> | undefined

    if (hideInnerComponent === true)
        return (
            <InputLabel input={input} showTypeBadges={false} isFlipped={isFlipped} />
        )

    if (Component)
        return <Component input={input} nodeId={nodeId} className={className} showTypeBadge={showTypeBadge} isFlipped={isFlipped} />

    return <EdgeOnlyInput input={input} nodeId={nodeId} className={className} showTypeBadge={showTypeBadge} isFlipped={isFlipped} />
})

