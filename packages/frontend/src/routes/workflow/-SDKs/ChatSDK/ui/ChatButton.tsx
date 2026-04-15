import { Button } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
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