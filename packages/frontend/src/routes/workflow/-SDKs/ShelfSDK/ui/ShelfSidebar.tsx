import { ScrollArea, Separator } from '@pretzel-graph/standard-ui/foundations'
import { Drawers } from './Drawers'
import SectionTabs from './SectionTabs'
import Search from './Search'

const ShelfSidebar = () => {
    return (
        <div className={`
            flex flex-col absolute z-20 left-5 top-24 bottom-24 w-[230px] bg-card/80 backdrop-blur-lg 
            border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10`}
        >
            <Search />

            <div className='w-full px-2'>
                <Separator/>
            </div>

            <ScrollArea.Root className='flex-1 min-h-0'>
                <Drawers />
            </ScrollArea.Root>

            <div className='w-full px-2'>
                <Separator/>
            </div>

            <SectionTabs />
        </div>
    )
}

export default ShelfSidebar

