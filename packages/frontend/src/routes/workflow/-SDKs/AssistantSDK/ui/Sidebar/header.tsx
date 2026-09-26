import { AssistantSDK } from '../../sdk'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { Assistant } from '@pretzel-graph/shared/domain'
import SelectThread from './SelectThread'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { Conversation } from '@/components/Conversation'

const Header = () => {

    const currentChatName = AssistantSDK.useStore(s => s.currentChat?.name)

    return (
        <Conversation.Header>
            <Conversation.Title icon={SystemIcons.Sparkles} iconClassName='fill-current' collapsed={Boolean(currentChatName)}>
                Assistant
            </Conversation.Title>

            <Conversation.Subtitle>{currentChatName}</Conversation.Subtitle>

            <Conversation.Actions>
                <Button size="icon-xs" variant="ghost-language-model" onClick={() => WorkbenchSDK.openWorkflowWindow(Assistant.WORKFLOW_ID)}>
                    <SystemIcons.Graph/>
                </Button>
            </Conversation.Actions>

            <Conversation.Actions className='ml-0'>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.thread.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <Button size="icon-xs" variant="ghost">
                            <SystemIcons.MessagesSquare className='text-secondary-foreground' />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" sideOffset={6} className='w-72'>
                        <SelectThread />
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.ui.openFullscreen()}>
                    <SystemIcons.Maximize2 className='text-secondary-foreground' />
                </Button>
            </Conversation.Actions>
        </Conversation.Header>
    )
}

export default Header
