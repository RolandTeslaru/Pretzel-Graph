import { ChatSDK } from '../../sdk'
import SelectChat from './SelectChat'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { Conversation } from '@/components/Conversation'

const Header = () => {

    const currentChatName = ChatSDK.useStore(s => s.currentChat?.name)

    return (
        <Conversation.Header>
            <Conversation.Title icon={SystemIcons.MessagesSquare} collapsed={Boolean(currentChatName)}>
                Conversation
            </Conversation.Title>

            <Conversation.Subtitle>{currentChatName}</Conversation.Subtitle>

            <Conversation.Actions>
                <Button size="icon-xs" variant="ghost" onClick={() => ChatSDK.actions.chat.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <Button size="icon-xs" variant="ghost">
                            <SystemIcons.MessagesSquare className='text-secondary-foreground' />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" sideOffset={6} className='w-72'>
                        <SelectChat />
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                <Button size="icon-xs" variant="ghost" onClick={() => ChatSDK.actions.ui.openFullscreen()}>
                    <SystemIcons.Maximize2 className='text-secondary-foreground' />
                </Button>
            </Conversation.Actions>
        </Conversation.Header>
    )
}

export default Header
