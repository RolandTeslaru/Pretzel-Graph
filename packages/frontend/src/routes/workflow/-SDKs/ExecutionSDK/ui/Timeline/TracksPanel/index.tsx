import { useEffect, useRef } from 'react'
import TrackColumn from '../TrackColumn'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { useTimelineFrame } from '../frame-context'

const TracksPanel = () => {
    const { labelsRef, onLabelScroll, layout, nodes } = useTimelineFrame()
    // panelRef drives drag positioning; labelsRef (from context) drives scroll sync
    const panelRef = useRef<HTMLDivElement>(null)
    const dragRef  = useRef<{ startX: number; origLeft: number } | null>(null)

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const drag = dragRef.current
            const el   = panelRef.current
            if (!drag || !el) return
            const next    = drag.origLeft + (e.clientX - drag.startX)
            const maxLeft = window.innerWidth - el.offsetWidth
            el.style.left = `${Math.min(maxLeft, Math.max(20, next))}px`
        }
        const onMouseUp = () => { dragRef.current = null }

        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup",   onMouseUp)
        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("mouseup",   onMouseUp)
        }
    }, [])

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        const el = panelRef.current
        if (!el) return
        dragRef.current = {
            startX:   e.clientX,
            origLeft: el.getBoundingClientRect().left,
        }
    }

    return (
        <div
            ref={panelRef}
            style={{ left: 20 }}
            className="border border-border/70 top-2 w-[150px] h-[calc(100%-20px)] rounded-lg absolute z-20 bg-card/70 backdrop-blur-md shadow-md shadow-black/10 flex flex-col overflow-hidden"
        >
            {/* Grip — never scrolls */}
            <div className="flex-none flex items-center justify-center h-[19px] cursor-grab active:cursor-grabbing" onMouseDown={onMouseDown}>
                <SystemIcons.GripVertical className="size-3 rotate-90 text-muted-foreground" />
            </div>

            {/* Scrollable track list — labelsRef so parent handleScroll can sync scrollTop */}
            <div ref={labelsRef} onScroll={onLabelScroll} className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2">
                <TrackColumn layout={layout} nodes={nodes} />
            </div>
        </div>
    )
}

export default TracksPanel
