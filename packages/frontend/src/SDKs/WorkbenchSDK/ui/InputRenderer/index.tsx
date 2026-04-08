import { memo } from 'react'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { WorkbenchSDK } from '../../sdk'
import { Textarea } from '@vx-agent-editor/vx-ui/foundations'
import { HighlightedTextarea } from './HighlightedTextarea'
import { InputLabel } from './label';
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons';


type RendererProps<K extends Foundations.Port.Input['variant']> = {
    input: Extract<Foundations.Port.Input, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
    showTypeBadge?: boolean
    isFlipped?: boolean
}


// ── Variant Renderers ────────────────────────────────────────

const MessageInput = memo(({ input, nodeId, className, isFlipped }: RendererProps<'Message'>) => {
    const [value, issue] = WorkbenchSDK.useInput(nodeId, input.id);

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} isFlipped={isFlipped} />
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


const TextInput = memo(({ input, nodeId, className, isFlipped }: RendererProps<'Text'>) => {
    const [value, issue] = WorkbenchSDK.useInput(nodeId, input.id);

    let innerClassName = ""
    if(issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} isFlipped={isFlipped} />
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


// ── Dispatcher ───────────────────────────────────────────────

type InputRendererMapType = {
    [K in Foundations.Port.Input['variant']]?:
    React.ComponentType<{
        input: Extract<Foundations.Port.Input, { variant: K }>
        nodeId: Workflow.Node.Id
        className?: string
        isFlipped?: boolean
    }>
}

export const INPUT_RENDERER_MAP: InputRendererMapType = {
    Message: MessageInput,
    Text: TextInput,
}