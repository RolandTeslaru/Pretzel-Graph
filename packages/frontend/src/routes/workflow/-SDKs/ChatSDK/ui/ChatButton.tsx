import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ChatSDK } from '../sdk'
import Tipped from '@/components/Tipped'

const ChatButton = () => {

    const isSidebarVisible = ChatSDK.useStore(s => s.isSidebarVisible)

    return (
        <Tipped label={isSidebarVisible ? "Hide Chat" : "Show Chat"}>
            <Button
                variant={isSidebarVisible ? "active" : "ghost"}
                onClick={() => {
                    ChatSDK.actions.ui.setSidebarVisibility(!isSidebarVisible)
                }}
                size={"icon-sm"}
            >
                <SystemIcons.MessagesSquare className='scale-80'/>
            </Button>
        </Tipped>
    )
}

export default ChatButton
