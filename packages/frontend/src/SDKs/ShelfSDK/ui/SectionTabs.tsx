import { Tabs } from '@vx-agent-editor/vx-ui/foundations'
import { memo } from 'react'
import { ShelfSDK } from '../sdk'
import type { Shelf } from '@vx-agent-editor/shared/domain';

const SectionTabs = memo(() => {
    const selectedSection = ShelfSDK.useStore(s => s.selectedSection);
    return (
        <Tabs.Root className='w-full px-2' value={selectedSection} onValueChange={(val) => {
            ShelfSDK.actions.setSection(val as Shelf.Section)
        }}

        >
            <Tabs.List className='w-full' variant='primary' size='sm'>
                <Tabs.Trigger className='w-full font-semibold' value="core">Core</Tabs.Trigger>
                {/* <Tabs.Trigger className='w-full font-semibold' value="mcp">MCP</Tabs.Trigger> */}
                <Tabs.Trigger className='w-full font-semibold' value="bundle">Integrations</Tabs.Trigger>
            </Tabs.List>
        </Tabs.Root>
    )
})

export default SectionTabs