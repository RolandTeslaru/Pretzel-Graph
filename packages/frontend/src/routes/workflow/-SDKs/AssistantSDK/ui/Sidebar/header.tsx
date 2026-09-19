import { AssistantSDK } from '../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { Conversation } from '@/components/Conversation'

const Header = () => {
    return (
        <Conversation.Header>
            <Conversation.Title icon={SystemIcons.Sparkles} iconClassName='fill-current'>
                Assistant
            </Conversation.Title>
            <Conversation.Actions>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.thread.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.ui.openFullscreen()}>
                    <SystemIcons.Maximize2 className='text-secondary-foreground' />
                </Button>
            </Conversation.Actions>
        </Conversation.Header>
    )
}

export default Header
