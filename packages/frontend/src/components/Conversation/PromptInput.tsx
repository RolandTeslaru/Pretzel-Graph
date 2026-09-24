import { useRef, type ReactNode } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@pretzel-graph/standard-ui/foundations/input-group'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { ACCENT_BUTTON_VARIANT, PromptContext, useConversation, usePromptInput } from './context'

type PromptFormValues = {
    prompt: string
}

interface PromptInputProps {
    onSend:       (content: string) => void
    placeholder?: string
    disabled?:    boolean
    // Laid over the textarea, e.g. to explain why it is disabled.
    notice?:      ReactNode
    className?:   string
    // The bottom row: attach buttons, the send button.
    children?:    ReactNode
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSend, placeholder, disabled = false, notice, className, children }) => {
    const { handleSubmit, control, reset, formState: { isValid } } = useForm<PromptFormValues>({
        defaultValues: { prompt: "" },
        mode: 'onChange',
    })

    const { isRunning, isSendBtnDisabled } = useConversation()

    const formRef = useRef<HTMLFormElement>(null)

    const onSubmit = (data: PromptFormValues) => {
        const content = data.prompt.trim()

        if (!content || disabled || isRunning || isSendBtnDisabled)
            return

        onSend(content)
        reset({ prompt: "" })
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
            <InputGroup className={cn(
                'absolute z-10 bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] backdrop-blur-md bg-input/80 shadow-md!',
                'has-[[data-slot=input-group-control]:focus-visible]:border-(--conversation-accent)/50',
                'has-[[data-slot=input-group-control]:focus-visible]:ring-(--conversation-accent)/50',
                className,
            )}>
                {notice && (
                    <p className='absolute top-1/2 -translate-y-1/2 text-xs text-foreground flex items-center gap-1'>
                        {notice}
                    </p>
                )}
                <Controller
                    name="prompt"
                    control={control}
                    rules={{ required: true, validate: (val) => val.trim().length > 0 }}
                    render={({ field }) => (
                        <InputGroupTextarea
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    formRef.current?.requestSubmit()
                                }
                            }}
                            placeholder={placeholder}
                            disabled={disabled}
                        />
                    )}
                />
                <InputGroupAddon align="block-end">
                    <PromptContext.Provider value={{ canSend: isValid && !disabled && !isRunning && !isSendBtnDisabled, disabled }}>
                        {children}
                    </PromptContext.Provider>
                </InputGroupAddon>
            </InputGroup>
        </form>
    )
}

// Not the native `disabled`: that disables the whole textarea. While running it stops the reply instead.
export const SendButton: React.FC = () => {
    const { accent, isRunning, onStop } = useConversation()
    const { canSend } = usePromptInput()

    if (isRunning)
        return (
            <InputGroupButton
                variant={ACCENT_BUTTON_VARIANT[accent]}
                className={cn('ml-auto transition-opacity', onStop ? 'opacity-100 hover:opacity-90' : 'opacity-50 cursor-not-allowed')}
                type="button"
                aria-label="Stop"
                onClick={() => onStop?.()}
            >
                <span>Stop</span>
                <SystemIcons.Square className='fill-current' />
            </InputGroupButton>
        )

    return (
        <InputGroupButton
            variant={ACCENT_BUTTON_VARIANT[accent]}
            className={cn('ml-auto transition-opacity', canSend ? 'opacity-100 hover:opacity-90' : 'opacity-50 cursor-not-allowed')}
            type="submit"
            onClick={(e) => {
                if (!canSend)
                    e.preventDefault()
            }}
        >
            <span>Send</span>
            <SystemIcons.ArrowUp />
        </InputGroupButton>
    )
}
