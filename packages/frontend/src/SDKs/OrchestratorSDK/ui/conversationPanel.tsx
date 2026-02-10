import { DropdownMenu, Separator } from '@/vx-ui/foundations'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from '@/vx-ui/foundations/input-group'
import { SystemIcons } from '@/vx-ui/icons'

export const ConversationPanel = () => {
    return (
        <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-1'>

            </div>
            <InputGroup>
                <InputGroupTextarea placeholder="Ask, Search or Chat..." />
                <InputGroupAddon align="block-end">
                    <InputGroupButton
                        variant="default"
                        className="style-lyra:rounded-none rounded-full"
                        size="icon-xs"
                        aria-label="Add"
                    >
                        <SystemIcons.Plus/>
                    </InputGroupButton>
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <InputGroupButton variant="ghost">Auto</InputGroupButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content
                            side="top"
                            align="start"
                            className="[--radius:0.95rem]"
                        >
                            <DropdownMenu.Item>Auto</DropdownMenu.Item>
                            <DropdownMenu.Item>Agent</DropdownMenu.Item>
                            <DropdownMenu.Item>Manual</DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                    <InputGroupText className="ml-auto">52% used</InputGroupText>
                    <Separator orientation="vertical" className="h-4!" />
                    <InputGroupButton
                        variant="default"
                        className="style-lyra:rounded-none rounded-full"
                        size="icon-xs"
                    >
                        <SystemIcons.ArrowUp
                        />
                        <span className="sr-only">Send</span>
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    )
}
