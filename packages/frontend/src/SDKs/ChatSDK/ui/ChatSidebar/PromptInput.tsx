import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/vx-ui/foundations/input-group'
import { SystemIcons } from '@/vx-ui/icons'
import { ChatSDK } from '../../sdk'
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { OrchestratorSDK } from '@/SDKs/OrchestratorSDK/sdk'

type PromptFormValues = {
    prompt: string
}

const PromptInput = () => {
    const { handleSubmit, control, reset, formState: { isValid } } = useForm<PromptFormValues>({
        defaultValues: {
            prompt: ""
        },
        mode: 'onChange'
    })

    const formRef = useRef<HTMLFormElement>(null)

    const onSubmit = (data: PromptFormValues) => {
        if (!data.prompt.trim()) return;

        const workflow = WorkbenchSDK.state.workflow;
        const snapshot = OrchestratorSDK.state.snapshot;

        ChatSDK.actions.message.send({ 
            content: data.prompt.trim(),
            workflow,
            snapshot
         })
        reset({ prompt: "" })
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
            <InputGroup>
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
                    <ArtifactAddButton />
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
            e.preventDefault();
            onSend();
        }
    }

    return (
        <InputGroupTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask, Search or Chat..."
        />
    )
}

const SendButton = ({ disabled }: { disabled: boolean }) => {
    return (
        <InputGroupButton
            variant="default"
            className={`ml-auto transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:opacity-90'}`}
            type="submit"
            onClick={(e) => {
                if (disabled) e.preventDefault();
            }}
        >
            <span>Send</span>
            <SystemIcons.ArrowUp />
        </InputGroupButton>
    )
}

const ArtifactAddButton = () => {
    return (
        <InputGroupButton
            variant="default"
            className="style-lyra:rounded-none rounded-full"
            size="icon-xs"
            aria-label="Add"
        >
            <SystemIcons.Plus />
        </InputGroupButton>
    )
}