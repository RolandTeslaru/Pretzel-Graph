import { useCallback, useMemo, useRef } from "react"
import { ExecutionSDK } from "../../sdk"
import { getTimelineLayout, getTotalDuration } from "../../selectors"
import type { TimelineTrackLayout } from "../../selectors"
import type { Workflow } from "@pretzel-graph/shared/domain"
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

    // Per-track layout cache for structural sharing — keeps unchanged tracks'
    // layout objects reference-stable so the memoized TrackRows bail on a tick.
    const layoutCacheRef = useRef<Map<Workflow.Node.Id, TimelineTrackLayout>>(new Map())
    const layout        = useMemo(() => getTimelineLayout(recording, nodes, layoutCacheRef.current), [recording, nodes])
    const totalDuration = useMemo(() => getTotalDuration(recording),         [recording])
    // In linear mode the scale fns (xFor/widthFor) are pure `ms * zoom` — they
    // don't read `recording` or `totalDuration`. Excluding those from the deps
    // keeps `scale` reference-stable across streaming events so the memoized
    // UoWBlocks don't all re-render on every UoW update. step/equalize genuinely
    // depend on unit data, so they keep the full deps.
    const scaleRecordingDep = viewMode === "linear" ? null : recording
    const scaleDurationDep  = viewMode === "linear" ? 0    : totalDuration
    const scale = useMemo(
        () => makeTimeScale(viewMode, zoom, recording, totalDuration),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [viewMode, zoom, scaleRecordingDep, scaleDurationDep],
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

    // scale is intentionally stale in linear mode (see scale memo), so derive the
    // live container width from totalDuration there instead of scale.totalWidth.
    const scaleTotalWidth = viewMode === "linear" ? totalDuration * zoom : scale.totalWidth
    const totalWidth  = Math.max(scaleTotalWidth + 80, 400)
    const scrollWidth = totalWidth + Math.max(window.innerWidth, totalWidth)
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

            
            <div className="flex h-full overflow-hidden min-w-[200vw]">
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
                        <div style={{ position: "relative", width: scrollWidth, height: totalHeight }}>
                            {layout.tracks.map(tl => (
                                <TrackRow
                                    key={tl.track.id}
                                    trackLayout={tl}
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
