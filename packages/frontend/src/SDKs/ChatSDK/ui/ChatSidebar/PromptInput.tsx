import { DropdownMenu, Separator } from '@/vx-ui/foundations'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from '@/vx-ui/foundations/input-group'
import { SystemIcons } from '@/vx-ui/icons'

const PromptInput = () => {
    return (
        <InputGroup>
            <PromptTextArea />
            <InputGroupAddon align="block-end">
                <ArtifactAddButton/>

                {/* <Separator orientation="vertical" className="h-4!" /> */}
                <SendButton />
            </InputGroupAddon>
        </InputGroup>
    )
}

export default PromptInput


const PromptTextArea = () => {
    return (
        <InputGroupTextarea placeholder="Ask, Search or Chat..." />
    )
}

const SendButton = () => {
    return (
        <InputGroupButton
            variant="default"
            className="style-lyra:rounded-none rounded-full"
            size="icon-xs"
        >
            <SystemIcons.ArrowUp />
            <span className="sr-only">Send</span>
        </InputGroupButton>
    )
}

const ArtifactAddButton = () => {
    return (
        <InputGroupButton
            variant="default"
            className="style-lyra:rounded-none rounded-full"
            size="icon-xs"
            aria-label="Add"
        >
            <SystemIcons.Plus />
        </InputGroupButton>
    )
}