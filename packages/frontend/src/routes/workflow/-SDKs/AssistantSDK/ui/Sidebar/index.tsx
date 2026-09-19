import { memo, useEffect } from 'react'
import { AssistantSDK } from '../../sdk'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK'
import AssistantPanel from '../ConversationArea'
import { AuroraRays } from '@/components/AuroraRays/AuroraRays'
import ConversationRoot from '../ConversationRoot'
import { Conversation } from '@/components/Conversation'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button } from '@pretzel-graph/standard-ui/foundations'

const AssistantSidebar = () => {
    const isSidebarVisible = AssistantSDK.useStore(s => s.isSidebarVisible)

    useEffect(() => {
        if (isSidebarVisible) {
            StackSDK.actions.push("assistantSidebar", (props) => (
                <StackSDK.Template {...props}>
                    <ConversationRoot>
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
                        <AssistantPanel />
                        <div className='pointer-events-none absolute top-0 left-0 w-full h-2/3 z-[-1] -scale-x-100'>
                            <AuroraRays />
                        </div>
                    </ConversationRoot>
                </StackSDK.Template>
            ))
        } else {
            StackSDK.actions.pop("assistantSidebar")
        }
    }, [isSidebarVisible])

    return null
}

export default AssistantSidebar
