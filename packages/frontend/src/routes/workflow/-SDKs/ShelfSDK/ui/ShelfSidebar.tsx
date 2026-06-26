import { ScrollArea, Separator } from '@pretzel-graph/standard-ui/foundations'
import { Drawers } from './Drawers'
import SectionTabs from './SectionTabs'
import Search from './Search'
import { ShelfSDK } from '../sdk'
import { nodeColorsName } from '@/utils/styleUtils'
import type { Foundations } from '@pretzel-graph/shared/domain'

const ShelfSidebar = () => {
    return (
        <div className={`
            flex flex-col absolute z-20 left-5 top-24 bottom-24 w-[230px] bg-card/70 backdrop-blur-lg 
            border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10`}
        >
            <Search />

            <div className='w-full px-2'>
                <Separator/>
            </div>

            <FilterDataTypesIndicator />

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

const FilterDataTypesIndicator = () => {
    const dataTypes = ShelfSDK.useStore(s => s.searchFilter.dataTypes);
    if (!dataTypes) return null;
    return (
        <div className='absolute left-1/2 -translate-x-1/2 top-[51px] flex flex-row gap-2'>
            {Array.from(dataTypes).map(type => <TypeIndicator handleVariant={type} key={type} />)}
        </div>
    )
}

const TypeIndicator = ({ handleVariant }: { handleVariant: Foundations.Port.Variant }) => {
    const left = true
    const colorName = nodeColorsName[handleVariant] ?? "unknown";

    const style = {
        backgroundColor: left
            ? `var(--datatype-${colorName})`
            : `var(--datatype-${colorName}-foreground)`,
        color: left
            ? `var(--datatype-${colorName}-foreground)`
            : `var(--datatype-${colorName})`,
    };

    return (
        <div className='content-[" "] h-1 w-4 rounded-full animate-pulse' style={style}
            onClick={() => {
                ShelfSDK.actions.searchFilter.toggleDataType(handleVariant)
            }}
        />
    )
}
