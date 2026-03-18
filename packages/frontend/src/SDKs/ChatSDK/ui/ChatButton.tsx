import { Button } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { ChatSDK } from '../sdk'

const ChatButton = () => {

    const isSidebarVisible = ChatSDK.useStore(s => s.isSidebarVisible)

    return (
        <Button
            variant={isSidebarVisible ? "active" : "outline"}
            onClick={() => {
                ChatSDK.actions.ui.setSidebarVisibility(!isSidebarVisible)
            }}
        >
            <SystemIcons.MessagesSquare />
            Chat
        </Button>
    )
}

export default ChatButton