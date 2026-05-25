import { useCallback, useMemo, useRef } from "react"
import { ExecutionSDK } from "../../sdk"
import { getTimelineLayout, getTotalDuration } from "../../selectors"
import { useTimelineViewerStore, timelineViewerActions } from "../../timeline-viewer-store"
import { WorkbenchSDK } from "../../../WorkbenchSDK/sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { Button } from "@pretzel-graph/standard-ui/foundations"
import TimeRuler from "./TimeRuler"
import TrackRow from "./TrackRow"
import RelationLayer from "./RelationLayer"
import { Execution } from "@pretzel-graph/shared/domain"
import { makeTimeScale } from "./time-scale"
import FloatContainer from "@/components/FloatContainer"
import TimelineControls from "./Controls"
import TracksPanel from "./TracksPanel"

const ZOOM_STEP = 1.4

const TimelineViewer = () => {
    const recording = ExecutionSDK.useStore(s => s.currentExecution?.recording ?? null)

    const [zoom, showRemnants, viewMode] = useTimelineViewerStore(s => [
        s.zoom,
        s.showRemnants,
        s.viewMode,
    ])

    const workbenchNodes = WorkbenchSDK.useStore(s => s.data.nodes)
    const snapshotNodes = recording?.workflowDataSnapshot?.nodes
    const nodes = (snapshotNodes && Object.keys(snapshotNodes).length > 0) ? snapshotNodes : workbenchNodes

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
        if (rulerRef.current)  rulerRef.current.scrollLeft  = sc.scrollLeft
        if (labelsRef.current) labelsRef.current.scrollTop  = sc.scrollTop
    }, [])

    const handleLabelScroll = useCallback(() => {
        const lb = labelsRef.current
        if (!lb) return
        if (scrollRef.current) scrollRef.current.scrollTop = lb.scrollTop
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
            <TimelineControls/>
                    
            <TracksPanel labelsRef={labelsRef} onScroll={handleLabelScroll} layout={layout} nodes={nodes} />

            
            <div className="flex h-full overflow-hidden">
                {/* Main grid */}
                <div
                    className="flex-1 overflow-hidden"
                    style={{
                        display: "grid",
                        // gridTemplateColumns: `${TRACK_LABEL_W}px 1fr`,
                        gridTemplateRows: `${Execution.Recording.Timeline.RULER_H}px 1fr`,
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
                                    trackLayout={tl}
                                    recording={recording}
                                    nodes={nodes}
                                    scale={scale}
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
            </div>
        </>
    )
}

export default TimelineViewer
