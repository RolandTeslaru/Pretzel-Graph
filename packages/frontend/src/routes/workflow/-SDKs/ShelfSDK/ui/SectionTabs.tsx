import { Tabs } from '@pretzel-graph/standard-ui/foundations'
import { memo } from 'react'
import { ShelfSDK } from '../sdk'
import type { Shelf } from '@pretzel-graph/shared/domain';

const SectionTabs = memo(() => {
    const selectedSection = ShelfSDK.useStore(s => s.selectedSection);
    return (
        <Tabs.Root className='w-full p-2' value={selectedSection} onValueChange={(val) => {
            ShelfSDK.actions.setSection(val as Shelf.Section)
        }}

        >
            <Tabs.List className='w-full' variant='primary' size='sm'>
                <Tabs.Trigger className='w-full font-semibold select-none' value="core_extended">Core</Tabs.Trigger>
                <Tabs.Trigger className='w-full font-semibold select-none' value="integrations">Integrations</Tabs.Trigger>
            </Tabs.List>
        </Tabs.Root>
    )
})

export default SectionTabs