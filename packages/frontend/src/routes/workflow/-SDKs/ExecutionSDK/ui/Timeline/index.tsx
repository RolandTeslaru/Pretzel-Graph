import React, { useCallback, useMemo, useRef } from "react"
import { ExecutionSDK } from "../../sdk"
import { getTimelineLayout, getTotalDuration } from "../../selectors"
import { useTimelineViewerStore, timelineViewerActions } from "../../timeline-viewer-store"
import { WorkbenchSDK } from "../../../WorkbenchSDK/sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { Button } from "@pretzel-graph/standard-ui/foundations"
import TimeRuler from "./TimeRuler"
import TrackColumn from "./TrackColumn"
import TrackRow from "./TrackRow"
import RelationLayer from "./RelationLayer"
import UoWInspector from "./UoWInspector"
import { RULER_H } from "./constants"
import { makeTimeScale } from "./time-scale"
import FloatContainer from "@/components/FloatContainer"

const ZOOM_STEP = 1.4

const TimelineViewer = () => {
    const recording = ExecutionSDK.useStore(s => s.currentRecording)

    const [zoom, showRemnants, viewMode] = useTimelineViewerStore(s => [
        s.zoom,
        s.showRemnants,
        s.viewMode,
    ])

    const workbenchNodes = WorkbenchSDK.useStore(s => s.data.nodes)
    const nodes = recording?.workflowDataSnapshot?.nodes ?? workbenchNodes

    const layout        = useMemo(() => getTimelineLayout(recording, nodes), [recording, nodes])
    const totalDuration = useMemo(() => getTotalDuration(recording),         [recording])
    const scale = useMemo(
        () => makeTimeScale(viewMode, zoom, recording, totalDuration),
        [viewMode, zoom, recording, totalDuration],
    )

    const scrollRef = useRef<HTMLDivElement>(null)
    const rulerRef = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)

    const handleScroll = useCallback(() => {
        const sc = scrollRef.current
        if (!sc) return
        if (rulerRef.current) rulerRef.current.scrollLeft = sc.scrollLeft
        if (labelsRef.current) labelsRef.current.scrollTop = sc.scrollTop
    }, [])

    const totalWidth  = Math.max(scale.totalWidth + 80, 400)
    const totalHeight = layout.totalHeight

    if (!recording) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2 animate-pulse">
                <SystemIcons.Film className="text-muted-foreground size-5"/>
                No recording loaded
            </div>
        )
    }

    return (
        <>
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
            <div className="flex h-full overflow-hidden">
                {/* Main grid */}
                <div
                    className="flex-1 overflow-hidden"
                    style={{
                        display: "grid",
                        // gridTemplateColumns: `${TRACK_LABEL_W}px 1fr`,
                        gridTemplateRows: `${RULER_H}px 1fr`,
                    }}
                >
    

                    {/* Time ruler */}
                    <div
                        ref={rulerRef}
                        style={{ overflowX: "hidden" }}
                        className="border-b border-border pl-[180px]"
                    >
                        <TimeRuler
                            totalWidth={totalWidth}
                            scale={scale}
                            totalDuration={totalDuration}
                        />
                    </div>

                    {/* Track labels */}
                    <div
                        ref={labelsRef}
                        style={{ overflowY: "hidden" }}
                        className="border border-border/70 w-[150px] h-[300px] rounded-lg pt-[19px] pb-2 px-1 absolute left-5 top-2 z-20 bg-card/70 backdrop-blur-md shadow-md shadow-black/10"
                    >
                        <TrackColumn layout={layout} nodes={nodes} />
                    </div>

                    {/* Scrollable track canvas */}
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        style={{ overflowX: "auto", overflowY: "auto" }}
                        className="pl-[180px] pb-20"
                    >
                        <div style={{ position: "relative", width: totalWidth, height: totalHeight }}>
                            {layout.tracks.map(tl => (
                                <TrackRow
                                    key={tl.track.id}
                                    track={tl.track}
                                    recording={recording}
                                    nodes={nodes}
                                    scale={scale}
                                    top={tl.top}
                                    height={tl.height}
                                />
                            ))}
                            <RelationLayer
                                recording={recording}
                                nodes={nodes}
                                scale={scale}
                                layout={layout}
                                showRemnants={showRemnants}
                                totalWidth={totalWidth}
                                totalHeight={totalHeight}
                            />
                        </div>
                    </div>
                </div>

                {/* Inspector side panel */}
                {/* <UoWInspector nodes={nodes} /> */}
            </div>
        </>
    )
}

export default TimelineViewer
