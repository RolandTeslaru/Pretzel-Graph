import React, { memo, useEffect, useState } from 'react'
import { ShelfSDK } from '../sdk'
import { Shelf } from "@pretzel-graph/shared/domain";
import { Spinner } from '@pretzel-graph/standard-ui/foundations';
import { useShallow } from 'zustand/react/shallow';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import DrawerItem from './DrawerItem';
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon';
import { QuerySDK } from '@/SDKs/QuerySDK/sdk';


export const Drawers = () => {

    const selectedSection = ShelfSDK.useStore(s => s.selectedSection);

    QuerySDK.useQuery(
        [`${selectedSection}-blueprints`],
        () => ShelfSDK.actions.loadSection(selectedSection)
    )

    const filteredDrawers = ShelfSDK.useStore(useShallow(s => {
        if (s.loadedSections.has(s.selectedSection) === false)
            return undefined;

        const drawerIds = s.sections[s.selectedSection]

        if (s.searchFilter.query === "" || !s.searchFilter.query)
            return drawerIds.map(id => s.drawers[id])

        return Object.values(s.filteredDrawers)
    }))

    return (
        <div className='flex flex-col gap-1 w-full h-full px-2'>
            {filteredDrawers === undefined ?
                <div className='flex flex-row gap-2 text-foreground m-auto mt-1'>
                    <Spinner className='h-5' />
                </div>
                :
                <>
                    {filteredDrawers.map(drawer => {
                        if (drawer.blueprintIds.length === 0)
                            return;

                        return <Drawer drawer={drawer} key={drawer.id} />
                    })}
                </>
            }
        </div>
    )
}

export default Drawers

interface Props extends React.HTMLAttributes<HTMLDivElement> {
    drawer: Shelf.Drawer
}


const CLOSE_MS = 300;
const ITEM_H = 32;      // h-8
const GAP = 4;          // gap-1
const PADDING_Y = 8 // py-1

const Drawer: React.FC<Props> = memo(({ drawer }) => {
    const isOpen = ShelfSDK.useStore(s => s.openedDrawers.has(drawer.id));

    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            if (shouldRender === false)
                setShouldRender(true);
            return;
        }

        if (shouldRender === false)
            return

        const t = window.setTimeout(() => setShouldRender(false), CLOSE_MS);
        return () => window.clearTimeout(t);
    }, [isOpen]);

    if (!drawer || drawer.blueprintIds?.length === 0) return;

    const count = drawer.blueprintIds?.length ?? 0;
    const contentMaxH = count > 0 ? count * ITEM_H + (count - 1) * GAP + PADDING_Y : 0;


    const isFetchingNodeDefinitions = shouldRender && !!!drawer.blueprintIds;

    return (
        <div>
            <div
                className='flex flex-row gap-2 h-8 px-2 cursor-pointer hover:bg-primary/40 rounded-lg'
                onClick={() => ShelfSDK.actions.drawer.toggle(drawer.id)}
            >
                <LazyIcon name={drawer.icon} className={`min-w-4 size-4 h-4 my-auto ${isOpen ? "text-primary" : ""}`} />
                <p className='text-sm font-medium text-card-foreground my-auto w-full text-left!'>
                    {drawer.displayName}
                </p>
                {
                    isFetchingNodeDefinitions === false ?
                        <SystemIcons.ChevronRight className={`h-4 w-4 stroke-3! stroke-label-white m-auto transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
                        :
                        <Spinner className='my-auto mr-1' />
                }
            </div>

            {/* Content */}
            <div className="transition-[max-height,opacity] duration-300 ease-in-out"
                style={{
                    maxHeight: isOpen ? contentMaxH : 0,
                    opacity: isOpen ? 1 : 0
                }}
            >
                <div className=' flex flex-col gap-1 py-1'>
                    {shouldRender && drawer.blueprintIds.map(blueprintId => (
                        <DrawerItem blueprintId={blueprintId} key={blueprintId} />
                    ))}
                </div>
            </div>
        </div>
    )
})
