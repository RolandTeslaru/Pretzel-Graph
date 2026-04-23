import { memo } from 'react'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain';
import { WorkbenchSDK } from '../../sdk'
import { Textarea } from '@pretzel-graph/vx-ui/foundations'
import { HighlightedTextarea } from './HighlightedTextarea'
import { InputLabel, type InputLabelVariant, type InputLabelSize } from './label';
import { SystemIcons } from '@pretzel-graph/vx-ui/icons';


type RendererProps<K extends Foundations.Port.Input['variant']> = {
    input: Extract<Foundations.Port.Input, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
    showTypeBadge?: boolean
    isFlipped?: boolean
    labelVariant?: InputLabelVariant
    labelSize?: InputLabelSize
}


// ── Variant Renderers ────────────────────────────────────────

const MessageInput = memo(({ input, nodeId, className, isFlipped, labelVariant, labelSize }: RendererProps<'Message'>) => {
    const [value, issue] = WorkbenchSDK.useInput(nodeId, input.id);

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} isFlipped={isFlipped} variant={labelVariant} size={labelSize} />
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


const TextInput = memo(({ input, nodeId, className, isFlipped, labelVariant, labelSize }: RendererProps<'Text'>) => {
    const [value, issue] = WorkbenchSDK.useInput(nodeId, input.id);

    let innerClassName = ""
    if(issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full flex flex-col gap-1"}>
            <InputLabel input={input} isFlipped={isFlipped} variant={labelVariant} size={labelSize} />
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
        labelVariant?: InputLabelVariant
        labelSize?: InputLabelSize
    }>
}

export const INPUT_RENDERER_MAP: InputRendererMapType = {
    Message: MessageInput,
    Text: TextInput,
}