import { Tabs } from '@/vx-ui/foundations'
import { memo } from 'react'
import { ShelfSDK } from '../sdk'

const SectionTabs = memo(() => {
    const selectedSection = ShelfSDK.useStore(s => s.selectedSection);
    return (
        <Tabs.Root className='w-full px-2' value={selectedSection} onValueChange={(val) => {
            ShelfSDK.actions.setSection(val as ShelfSDK.Section)
        }}>
            <Tabs.List className='w-full' indicatorVariant="primary" size="sm" >
                <Tabs.Trigger className='w-full font-semibold' value="core">Core</Tabs.Trigger>
                <Tabs.Trigger className='w-full font-semibold' value="mcp">MCP</Tabs.Trigger>
                <Tabs.Trigger className='w-full font-semibold' value="bundles">Bundles</Tabs.Trigger>
            </Tabs.List>
        </Tabs.Root>
    )
})

export default SectionTabs