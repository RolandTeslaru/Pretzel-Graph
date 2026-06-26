import FloatContainer from '@/components/FloatContainer'
import { Button, Select } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import React from 'react'
import { timelineViewerActions, useTimelineViewerStore } from '../../timeline-viewer-store'
import { ExecutionSDK } from '../../sdk'

const ZOOM_STEP = 1.4

const TimelineControls = () => {

    const [zoom, showRemnants, viewMode] = useTimelineViewerStore(s => [
            s.zoom,
            s.showRemnants,
            s.viewMode,
        ])
    
    return (
        <div className="absolute flex flex-row p-1 gap-1! bottom-2 left-1/2 -translate-x-1/2 z-10">
            <FloatContainer>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => timelineViewerActions.setZoom(zoom / ZOOM_STEP)}
                    title="Zoom out"
                >
                    <SystemIcons.Minus className="size-4" />
                </Button>
                <button
                    onClick={() => timelineViewerActions.setZoom(1)}
                    title="Reset zoom"
                    className="text-[12px] tabular-nums min-w-[44px] px-1 hover:opacity-70"
                >
                    {Math.round((zoom / 10) * 100)}%
                </button>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => timelineViewerActions.setZoom(zoom * ZOOM_STEP)}
                    title="Zoom in"
                >
                    <SystemIcons.Plus className="size-4" />
                </Button>
            </FloatContainer>
            <FloatContainer>
                
                {/* <Button
                    size="xs"
                    variant={viewMode === "linear" ? "ghost" : "active"}
                    onClick={() => timelineViewerActions.toggleViewMode()}
                    title="Cycle view mode (linear → equalize → step)"
                    className="px-2 gap-1"
                >
                    <span className="text-[10px] capitalize">{viewMode}</span>
                </Button> */}
                <Button
                    size="icon-sm"
                    variant={showRemnants ? "active" : "ghost-active"}
                    onClick={() => timelineViewerActions.toggleRemnants()}
                    title={showRemnants ? "Hide data remnants" : "Show data remnants"}
                >
                    <SystemIcons.Eye className="size-4" />
                </Button>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                        const data = ExecutionSDK.state.currentExecution?.recording
                        if (!data) return
                        const blob = new Blob([JSON.stringify(data)], { type: "application/json" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `execution-recording-${Date.now()}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                    }}
                >
                    <SystemIcons.Download className="size-4" />
                </Button>
                <Select.Root value={viewMode} onValueChange={(value) => timelineViewerActions.setViewMode(value as any)}>
                    <Select.Trigger size="sm" variant="ghost">
                        <span className="text-[12px] capitalize">{viewMode}</span>
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="linear">Linear</Select.Item>
                        <Select.Item value="equalize">Equalize</Select.Item>
                        <Select.Item value="step">Step</Select.Item>
                    </Select.Content>
                </Select.Root>
            </FloatContainer>
        </div>
    )
}

export default TimelineControls
