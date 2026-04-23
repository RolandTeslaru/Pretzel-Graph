import { Button } from '@pretzel-graph/vx-ui/foundations'
import { SystemIcons } from '@pretzel-graph/vx-ui/icons'
import { ChatSDK } from '../sdk'

const ChatButton = () => {

    const isSidebarVisible = ChatSDK.useStore(s => s.isSidebarVisible)

    return (
        <Button
            variant={isSidebarVisible ? "active" : "ghost"}
            onClick={() => {
                ChatSDK.actions.ui.setSidebarVisibility(!isSidebarVisible)
            }}
            size={"icon-sm"}
        >
            <SystemIcons.MessagesSquare className='scale-80'/>
        </Button>
    )
}

export default ChatButton