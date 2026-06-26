import type { CSSProperties } from 'react'
import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import ConversationArea from '../ConversationArea'
import ChatList from './ChatList'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ChatSDK } from '../../sdk'

const FullscreenChat = ({ blockTransparency, surfaceStyle }: { blockTransparency: boolean; surfaceStyle: CSSProperties }) => {
    // In the background render solid; on top, frosted glass. `surfaceStyle` carries the stack
    // brightness — applied per card here so each card's backdrop-blur isn't trapped by a filtered ancestor.
    const surface = blockTransparency ? 'bg-card' : 'bg-card/70 backdrop-blur-lg'

    return (
        <div className="flex flex-row gap-10 h-[90vh]">
            <div style={surfaceStyle} className={`${surface} border border-border/50 rounded-2xl shadow-sm shadow-black/10 w-[250px] p-0 overflow-hidden`}>
                <ChatList />
            </div>
            <div style={surfaceStyle} className={`${surface} lg:w-[800px] border border-border/50 rounded-2xl shadow-sm shadow-black/10 overflow-hidden`}>
                <Header/>
                <ConversationArea />
            </div>
        </div>
    )
}

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