import { Button, Dialog } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AssistantSDK } from '../../sdk'
import AssistantPanel from '../ConversationArea'
import AssistantList from './AssistantList'
import { Conversation } from '@/components/Conversation'
import ConversationRoot from '../ConversationRoot'

const FullscreenAssistant = (props: DialogSDK.TemplateProps) => (
    <DialogSDK.SplitTemplate
        {...props}
        className='h-[90vh]'
        sidebarClassName='w-[250px] shrink-0 p-0! gap-0!'
        contentClassName='relative w-[800px] p-0! gap-0!'
        sidebarRenderer={() => (
            <Conversation.Root accent="LanguageModel">
                <AssistantList />
            </Conversation.Root>
        )}
    >
        <Dialog.Title className='hidden'>Assistant</Dialog.Title>
        <Dialog.Description className='hidden'>Chat with the workflow assistant</Dialog.Description>

        <ConversationRoot>
            <Header />
            <AssistantPanel />
        </ConversationRoot>
    </DialogSDK.SplitTemplate>
)

export default FullscreenAssistant

const Header = () => {
    const currentChatName = AssistantSDK.useStore(s => s.currentChat?.name)

    return (
        <Conversation.Header>
            <Conversation.Title icon={SystemIcons.Sparkles} iconClassName='fill-current'>Assistant</Conversation.Title>
            <Conversation.Subtitle>{currentChatName}</Conversation.Subtitle>
            <Conversation.Actions>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.thread.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.ui.closeFullscreen()}>
                    <SystemIcons.Minimize2 className='text-secondary-foreground' />
                </Button>
            </Conversation.Actions>
        </Conversation.Header>
    )
}
