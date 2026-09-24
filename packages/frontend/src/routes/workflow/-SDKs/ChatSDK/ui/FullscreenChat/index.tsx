import { Button, Dialog } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import ConversationArea from '../ConversationArea'
import ChatList from './ChatList'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ChatSDK } from '../../sdk'
import { Conversation } from '@/components/Conversation'
import ConversationRoot from '../ConversationRoot'

const FullscreenChat = (props: DialogSDK.TemplateProps) => (
    <DialogSDK.SplitTemplate
        {...props}
        className='h-[90vh] w-[1050px]'
        sidebarClassName='w-[250px] shrink-0 p-0! gap-0!'
        contentClassName='relative p-0! gap-0!'
        sidebarRenderer={() => (
            <Conversation.Root accent="Message">
                <ChatList />
            </Conversation.Root>
        )}
    >
        <Dialog.Title className='hidden'>Conversation</Dialog.Title>
        <Dialog.Description className='hidden'>Chat with this workflow</Dialog.Description>

        <ConversationRoot>
            <Header />
            <ConversationArea />
        </ConversationRoot>
    </DialogSDK.SplitTemplate>
)

export default FullscreenChat



const Header = () => {
    const currentChatName = ChatSDK.useStore(s => s.currentChat?.name)

    return (
        <Conversation.Header>
            <Conversation.Title icon={SystemIcons.MessagesSquare}>Conversation</Conversation.Title>
            <Conversation.Subtitle>{currentChatName}</Conversation.Subtitle>
            <Conversation.Actions>
                <Button size="icon-xs" variant="ghost" onClick={() => ChatSDK.actions.chat.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => ChatSDK.actions.ui.closeFullscreen()}>
                    <SystemIcons.Minimize2 className='text-secondary-foreground' />
                </Button>
            </Conversation.Actions>
        </Conversation.Header>
    )
}
