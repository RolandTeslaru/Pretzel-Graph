import { ScrollArea, Separator } from '@vx-agent-editor/vx-ui/foundations'
import { Drawers } from './Drawers'
import SectionTabs from './SectionTabs'
import Search from './Search'
import { ShelfSDK } from '../sdk'
import { nodeColorsName } from '@/utils/styleUtils'
import type { Foundations } from '@vx-agent-editor/shared/domain'

const ShelfSidebar = () => {
    return (
        <div className={`
            flex flex-col gap-2 fixed z-20 left-5 top-24 bottom-24 w-[230px] bg-card/80 backdrop-blur-lg 
            border border-border py-2 rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10`}
        >
            <Search />

            <Separator />

            <FilterDataTypesIndicator />

            <ScrollArea.Root className='mb-auto'>
                <Drawers />
            </ScrollArea.Root>

            <Separator />

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
