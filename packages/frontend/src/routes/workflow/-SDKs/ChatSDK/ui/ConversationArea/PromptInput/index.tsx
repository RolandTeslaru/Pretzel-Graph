import { InputGroupButton } from '@pretzel-graph/standard-ui/foundations/input-group'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ChatSDK } from '../../../sdk'
import { DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import AddImageDialogContent from './dialogs/AddImageDialog'
import AddFileDialogContent from './dialogs/AddFileDialog'
import { WorkbenchSDK } from '../../../../WorkbenchSDK/sdk'
import { NodeBadge } from '@/components/NodeBadge'
import { Conversation } from '@/components/Conversation'

const PromptInput: React.FC = () => {
    const hasChatInputNode = WorkbenchSDK.useDocument(d => {
        return Object.values(d.data.nodes).some(node => node.blueprintId === "Core.Chat.Input");
    })

    return (
        <Conversation.PromptInput
            onSend={(content) => ChatSDK.actions.message.send({ content })}
            placeholder="Ask, Search or Chat..."
            disabled={!hasChatInputNode}
            notice={!hasChatInputNode && (
                <>Add a <NodeBadge icon="MessagesSquare" label="Chat Input" accent="port-Message" /> node to send messages.</>
            )}
        >
            <ArtifactAddButton />
            <Conversation.SendButton />
        </Conversation.PromptInput>
    )
}

export default PromptInput

const ArtifactAddButton = () => {
    const { disabled } = Conversation.usePromptInput()

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <InputGroupButton
                    variant="message"
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
