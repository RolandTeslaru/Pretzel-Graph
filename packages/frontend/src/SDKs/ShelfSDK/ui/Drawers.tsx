import React, { memo, useEffect, useMemo, useState } from 'react'
import { ShelfSDK } from '../sdk'
import { Shelf } from "@vx-agent-editor/shared/types";
import BlueprintItem from './BlueprintItem';
import { Icon } from '@/vx-ui/foundations';
import { useShallow } from 'zustand/react/shallow';
import { SystemIcons } from '@/vx-ui/icons';


export const Drawers = () => {
    const filteredDrawers = ShelfSDK.useStore(useShallow(s => {
        const drawerIds = s.sections[s.selectedSection]

        if (!drawerIds || drawerIds.length === 0)
            return [];

        if (s.searchFilter.query === "" || !s.searchFilter.query)
            return drawerIds.map(id => s.drawers[id])

        return Object.values(s.filteredDrawers)
    }))

    return (
        <div className='flex flex-col gap-1 w-full h-full px-2'>
            {filteredDrawers.map(drawer => {
                if (drawer.blueprints?.length === 0)
                    return;

                return <Drawer drawer={drawer} key={drawer.id} />
            }
            )}
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

const Drawer: React.FC<Props> = memo(({ drawer, ...props }) => {
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

    if (!drawer || drawer.blueprints?.length === 0) return;

    const count = drawer.blueprints?.length ?? 0;
    const contentMaxH = count > 0 ? count * ITEM_H + (count - 1) * GAP + PADDING_Y : 0;

    return (
        <div>
            {/* Header*/}
            <div
                className='flex flex-row gap-2 h-8 px-2 cursor-pointer hover:bg-primary/40 rounded-lg'
                onClick={() => ShelfSDK.actions.drawer.toggle(drawer.id)}
            >
                <Icon fallback={null} name={drawer.icon} className={`w-[20px] h-[20px] my-auto ${isOpen ? "text-primary" : ""}`} />
                <p className='text-sm font-medium my-auto w-full text-left!'>
                    {drawer.display_name}
                </p>
                <SystemIcons.ChevronRight className={`h-8 w-8 stroke-3! stroke-label-white scale-[60%] m-auto transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
            </div>

            {/* Content */}
            <div className="transition-[max-height,opacity] duration-300 ease-in-out"
                style={{
                    maxHeight: isOpen ? contentMaxH : 0,
                    opacity: isOpen ? 1 : 0
                }}
            >
                <div className=' flex flex-col gap-1 py-1'>
                    {shouldRender && drawer.blueprints?.map(blueprintId => (
                        <BlueprintItem blueprintId={blueprintId} key={blueprintId} />
                    ))}
                </div>
            </div>
        </div>
    )
})
