import { Button, Dialog } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import ConversationArea from '../ConversationArea'
import ChatList from './ChatList'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ChatSDK } from '../../sdk'

const FullscreenChat = (props: DialogSDK.TemplateProps) => (
    <DialogSDK.SplitTemplate
        {...props}
        className='h-[90vh] w-[1050px]'
        sidebarClassName='w-[250px] shrink-0 p-0! gap-0!'
        contentClassName='relative p-0! gap-0!'
        sidebarRenderer={() => <ChatList />}
    >
        <Dialog.Title className='hidden'>Conversation</Dialog.Title>
        <Dialog.Description className='hidden'>Chat with this workflow</Dialog.Description>

        <Header />
        <ConversationArea />
    </DialogSDK.SplitTemplate>
)

export default FullscreenChat



const Header = () => {
    const currentChatName = ChatSDK.useStore(s => s.chats[s.currentChatId]?.name)

    return (
        <div className='flex flex-row gap-2 absolute top-2 w-[calc(100%-16px)] left-2 z-10 '>
            <div
                className='flex items-center gap-2 py-1.5 px-2 rounded-full backdrop-blur-sm'
                style={{ backgroundColor: 'color-mix(in srgb, var(--port-Message) 25%, transparent)' }}
            >
                <SystemIcons.MessagesSquare className='my-auto h-4 w-4' style={{ color: 'var(--port-Message-foreground)' }} />
                <p className='text-xs font-semibold text-(--port-Message-foreground)'>Conversation</p>
            </div>
            <p className='text-xs font-medium text-center h-auto p-1 my-auto truncate'>{currentChatName}</p>
            <div className='flex flex-row gap-2 border border-border bg-card-float rounded-full ml-auto my-auto h-auto p-0.5 shadow-md shadow-black/10'>
                <Button size="icon-xs" variant="ghost" className="" onClick={() => ChatSDK.actions.chat.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <Button size="icon-xs" variant="ghost" className=""
                    onClick={() => ChatSDK.actions.ui.closeFullscreen()}
                >
                    <SystemIcons.Minimize2 className='text-secondary-foreground' />
                </Button>
            </div>
        </div>


    )
}
