import ConversationArea from '../ConversationArea'
import ChatList from './ChatList'

const FullscreenChat = () => {
    return (
        <div className="flex flex-row gap-10 h-[90vh]">
            <div className='bg-card/80 border border-border/50 rounded-2xl shadow-sm shadow-black/10 w-[250px] p-0 backdrop-blur-lg'>
                <ChatList />
            </div>
            <div className='lg:w-[800px] bg-card/80 border border-border/50 rounded-2xl shadow-sm shadow-black/10 overflow-hidden backdrop-blur-lg'>
                <ConversationArea />
            </div>
        </div>
    )
}

export default FullscreenChat
