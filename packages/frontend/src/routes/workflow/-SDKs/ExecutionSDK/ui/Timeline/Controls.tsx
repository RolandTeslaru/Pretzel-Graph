import FloatContainer from '@/components/FloatContainer'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import React from 'react'
import { timelineViewerActions, useTimelineViewerStore } from '../../timeline-viewer-store'

const ZOOM_STEP = 1.4

const TimelineControls = () => {

    const [zoom, showRemnants, viewMode] = useTimelineViewerStore(s => [
            s.zoom,
            s.showRemnants,
            s.viewMode,
        ])
    
    return (
        <FloatContainer className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
            <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => timelineViewerActions.setZoom(zoom / ZOOM_STEP)}
                title="Zoom out"
            >
                <SystemIcons.Minus className="size-3" />
            </Button>
            <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => timelineViewerActions.setZoom(zoom * ZOOM_STEP)}
                title="Zoom in"
            >
                <SystemIcons.Plus className="size-3" />
            </Button>
            <Button
                size="xs"
                variant={viewMode === "linear" ? "ghost" : "secondary"}
                onClick={() => timelineViewerActions.toggleViewMode()}
                title="Cycle view mode (linear → equalize → step)"
                className="px-2 gap-1"
            >
                <SystemIcons.Activity className="size-3" />
                <span className="text-[10px] capitalize">{viewMode}</span>
            </Button>
            <Button
                size="icon-xs"
                variant={showRemnants ? "secondary" : "ghost"}
                onClick={() => timelineViewerActions.toggleRemnants()}
                title={showRemnants ? "Hide data remnants" : "Show data remnants"}
                className="ml-auto"
            >
                <SystemIcons.Eye className="size-3" />
            </Button>
        </FloatContainer>
    )
}

export default TimelineControls
