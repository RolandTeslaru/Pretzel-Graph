import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@pretzel-graph/standard-ui/foundations/input-group'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ChatSDK } from '../../sdk'
import { DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@/SDKs/DialogSDK'
import AddImageDialogContent from './AddImageDialog'
import AddFileDialogContent from './AddFileDialog'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { NodeBadge } from '@/components/NodeBadge'

type PromptFormValues = {
    prompt: string
}

interface Props {
    className: string
}

const PromptInput: React.FC<Props> = ({ className }) => {
    const hasChatInputNode = WorkbenchSDK.useStore(s => {
        return Object.values(s.data.nodes).some(node => node.blueprintId === "Core.Chat.Input");
    })
    
    const { handleSubmit, control, reset, formState: { isValid } } = useForm<PromptFormValues>({
        defaultValues: {
            prompt: ""
        },
        mode: 'onChange'
    })

    const formRef = useRef<HTMLFormElement>(null)

    const onSubmit = (data: PromptFormValues) => {
        if (!data.prompt.trim()) return;

        ChatSDK.actions.message.send({
            content: data.prompt.trim(),
        })
        reset({ prompt: "" })
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
            <InputGroup className={className}>
                {!hasChatInputNode && (
                    <p className='absolute top-1/2 -translate-y-1/2 text-xs text-foreground flex items-center gap-1'>
                        Add a <NodeBadge icon="MessagesSquare" label="Chat Input" accent="port-Message" /> node to send messages.
                    </p>
                )}
                <Controller
                    name="prompt"
                    control={control}
                    rules={{ required: true, validate: (val) => val.trim().length > 0 }}
                    render={({ field }) => (
                        <PromptTextArea
                            value={field.value}
                            onChange={field.onChange}
                            onSend={() => formRef.current?.requestSubmit()}
                            disabled={!hasChatInputNode}
                        />
                    )}
                />

                <InputGroupAddon align="block-end">
                    <ArtifactAddButton disabled={!hasChatInputNode} />
                    <SendButton disabled={!isValid || !hasChatInputNode} />
                </InputGroupAddon>
            </InputGroup>
        </form>
    )
}

export default PromptInput

const PromptTextArea = ({ value, onChange, onSend, disabled }: { value: string, onChange: (val: string) => void, onSend: () => void, disabled: boolean }) => {
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
            disabled={disabled}
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

const ArtifactAddButton = ({ disabled }: { disabled: boolean }) => {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <InputGroupButton
                    variant="default"
                    className="style-lyra:rounded-none rounded-full"
                    size="icon-xs"
                    aria-label="Add"
                    disabled={disabled}
                    onClick={(e) => {
                        if (disabled) e.preventDefault();
                    }}
                >
                    <SystemIcons.Plus />
                </InputGroupButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="min-w-40" side="top" align="start">
                <DropdownMenu.Item onSelect={() => {
                    DialogSDK.actions.push("add-file", (props) => (
                        <DialogSDK.Template {...props} className="max-w-md flex flex-col gap-4">
                            <AddFileDialogContent {...props} />
                        </DialogSDK.Template>
                    ))
                }}>
                    <SystemIcons.File className="mr-1" />
                    Add File
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {
                    DialogSDK.actions.push("add-image", (props) => (
                        <DialogSDK.Template {...props} className="max-w-md flex flex-col gap-4">
                            <AddImageDialogContent {...props} />
                        </DialogSDK.Template>
                    ))
                }}>
                    <SystemIcons.Image className="mr-1" />
                    Add Image
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}


