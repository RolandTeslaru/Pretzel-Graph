import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@pretzel-graph/standard-ui/foundations/input-group'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AssistantSDK } from '../../sdk'

type PromptFormValues = {
    prompt: string
}

interface Props {
    className: string
}

const PromptInput: React.FC<Props> = ({ className }) => {
    const { handleSubmit, control, reset, formState: { isValid } } = useForm<PromptFormValues>({
        defaultValues: { prompt: "" },
        mode: 'onChange'
    })

    const formRef = useRef<HTMLFormElement>(null)

    const onSubmit = (data: PromptFormValues) => {
        if (!data.prompt.trim()) return
        AssistantSDK.actions.message.send({ content: data.prompt.trim() })
        reset({ prompt: "" })
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
            <InputGroup className={`${className} has-[[data-slot=input-group-control]:focus-visible]:border-(--port-LanguageModel)/50 has-[[data-slot=input-group-control]:focus-visible]:ring-(--port-LanguageModel)/50`}>
                <Controller
                    name="prompt"
                    control={control}
                    rules={{ required: true, validate: (val) => val.trim().length > 0 }}
                    render={({ field }) => (
                        <PromptTextArea
                            value={field.value}
                            onChange={field.onChange}
                            onSend={() => formRef.current?.requestSubmit()}
                        />
                    )}
                />
                <InputGroupAddon align="block-end">
                    <SendButton disabled={!isValid} />
                </InputGroupAddon>
            </InputGroup>
        </form>
    )
}

export default PromptInput

const PromptTextArea = ({ value, onChange, onSend }: { value: string, onChange: (val: string) => void, onSend: () => void }) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

    return (
        <InputGroupTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the assistant..."
        />
    )
}

const SendButton = ({ disabled }: { disabled: boolean }) => {
    return (
        <InputGroupButton
            variant="language-model"
            className={`ml-auto transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:opacity-90'}`}
            type="submit"
            onClick={(e) => { if (disabled) e.preventDefault() }}
        >
            <span>Send</span>
            <SystemIcons.ArrowUp />
        </InputGroupButton>
    )
}
