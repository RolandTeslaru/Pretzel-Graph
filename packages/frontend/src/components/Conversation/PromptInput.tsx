import { useLayoutEffect, useRef, type ReactNode } from 'react'
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
    // Ready-made prompts shown above the input; clicking one sends it.
    suggestions?: readonly string[]
    // The bottom row: attach buttons, the send button.
    children?:    ReactNode
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSend, placeholder, disabled = false, notice, className, suggestions, children }) => {
    const { handleSubmit, control, reset, formState: { isValid } } = useForm<PromptFormValues>({
        defaultValues: { prompt: "" },
        mode: 'onChange',
    })

    const { isRunning, isSendBtnDisabled } = useConversation()

    const formRef       = useRef<HTMLFormElement>(null)
    const inputRef      = useRef<HTMLDivElement>(null)
    const suggestionRef = useRef<(HTMLButtonElement | null)[]>([])

    useLayoutEffect(() => {
        const inputTop = inputRef.current?.getBoundingClientRect().top

        if (!suggestions?.length || inputTop === undefined)
            return

        riseFromBehind(suggestionRef.current, inputTop)
    }, [suggestions])

    const canSendNow = !disabled && !isRunning && !isSendBtnDisabled

    const send = (text: string) => {
        const content = text.trim()

        if (!content || !canSendNow)
            return

        onSend(content)
        reset({ prompt: "" })
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit(data => send(data.prompt))}
            className='absolute z-10 bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] flex flex-col gap-2'
        >
            {suggestions && suggestions.length > 0 && (
                <div className='flex flex-col items-start gap-0.5'>
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion}
                            ref={element => { suggestionRef.current[index] = element }}
                            type="button"
                            className='flex items-start gap-1.5 max-w-full cursor-pointer rounded-md py-0.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 disabled:pointer-events-none'
                            disabled={!canSendNow}
                            onClick={() => send(suggestion)}
                        >
                            <SystemIcons.ChevronRight className='size-3 shrink-0 mt-0.5' />
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-x-8 bottom-0 h-10 rounded-full blur-xl bg-(--conversation-accent)/50',
                    isRunning && 'animate-pulse [animation-duration:6s]',
                )}
            />
            <InputGroup ref={inputRef} className={cn(
                'z-10 backdrop-blur-md bg-input/80',
                'shadow-md!',
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
                    <PromptContext.Provider value={{ canSend: isValid && canSendNow, disabled }}>
                        {children}
                    </PromptContext.Provider>
                </InputGroupAddon>
            </InputGroup>
        </form>
    )
}

const OVERSHOOT_RATIO = 0.22
const OVERSHOOT_MAX   = 20

// Slides each element up from the input's top edge into place, nearest first; farther ones travel and overshoot more.
function riseFromBehind(elements: (HTMLElement | null)[], inputTop: number) {
    const rising = elements
        .filter((element): element is HTMLElement => element !== null)
        .map(element => ({ element, distance: inputTop - element.getBoundingClientRect().top }))
        .sort((a, b) => a.distance - b.distance)

    rising.forEach(({ element, distance }, rank) => {
        const overshoot = Math.min(distance * OVERSHOOT_RATIO, OVERSHOOT_MAX)

        element.animate(
            [
                { transform: `translateY(${distance}px)`,    opacity: 0, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
                { transform: `translateY(${-overshoot}px)`, opacity: 1, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', offset: 0.6 },
                { transform: 'translateY(0)',               opacity: 1 },
            ],
            { duration: 600, delay: rank * 40, fill: 'backwards' },
        )
    })
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
