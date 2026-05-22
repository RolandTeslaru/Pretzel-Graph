import React, { useCallback, useMemo, useRef } from "react"
import { ExecutionSDK } from "../../sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { Button } from "@pretzel-graph/standard-ui/foundations"
import TimeRuler from "./TimeRuler"
import TrackColumn from "./TrackColumn"
import TrackRow from "./TrackRow"
import RelationLayer from "./RelationLayer"
import UoWInspector from "./UoWInspector"
import { RULER_H, TRACK_HEIGHT, TRACK_LABEL_W } from "./constants"

const ZOOM_STEP = 1.4

const TimelineViewer = () => {
    const recording     = ExecutionSDK.useStore(s => s.currentRecording)
    const zoom          = ExecutionSDK.useStore(s => s.zoom)
    const showRemnants  = ExecutionSDK.useStore(s => s.showRemnants)
    const orderedTracks = ExecutionSDK.useStore(s => s.selectors.getOrderedTracks(s))
    const totalDuration = ExecutionSDK.useStore(s => s.selectors.getTotalDuration(s))

    const scrollRef = useRef<HTMLDivElement>(null)
    const rulerRef  = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)

    const handleScroll = useCallback(() => {
        const sc = scrollRef.current
        if (!sc) return
        if (rulerRef.current)  rulerRef.current.scrollLeft  = sc.scrollLeft
        if (labelsRef.current) labelsRef.current.scrollTop  = sc.scrollTop
    }, [])

    const totalWidth  = Math.max(totalDuration * zoom + 80, 400)
    const totalHeight = orderedTracks.length * TRACK_HEIGHT

    const trackIndexMap = useMemo(
        () => new Map(orderedTracks.map((t, i) => [t.id, i])),
        [orderedTracks]
    )

    if (!recording) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No recording loaded
            </div>
        )
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main grid */}
            <div
                className="flex-1 overflow-hidden"
                style={{
                    display: "grid",
                    gridTemplateColumns: `${TRACK_LABEL_W}px 1fr`,
                    gridTemplateRows: `${RULER_H}px 1fr`,
                }}
            >
                {/* Corner — zoom controls */}
                <div className="border-r border-b border-border bg-muted/20 flex items-center gap-1 px-2">
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => ExecutionSDK.actions.setZoom(zoom / ZOOM_STEP)}
                        title="Zoom out"
                    >
                        <SystemIcons.Minus className="size-3" />
                    </Button>
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => ExecutionSDK.actions.setZoom(zoom * ZOOM_STEP)}
                        title="Zoom in"
                    >
                        <SystemIcons.Plus className="size-3" />
                    </Button>
                    <Button
                        size="icon-xs"
                        variant={showRemnants ? "secondary" : "ghost"}
                        onClick={() => ExecutionSDK.actions.toggleRemnants()}
                        title={showRemnants ? "Hide data remnants" : "Show data remnants"}
                        className="ml-auto"
                    >
                        <SystemIcons.Eye className="size-3" />
                    </Button>
                </div>

                {/* Time ruler */}
                <div
                    ref={rulerRef}
                    style={{ overflowX: "hidden" }}
                    className="border-b border-border bg-muted/20"
                >
                    <TimeRuler
                        totalWidth={totalWidth}
                        zoom={zoom}
                        totalDuration={totalDuration}
                    />
                </div>

                {/* Track labels */}
                <div
                    ref={labelsRef}
                    style={{ overflowY: "hidden" }}
                    className="border-r border-border bg-background"
                >
                    <TrackColumn tracks={orderedTracks} recording={recording} />
                </div>

                {/* Scrollable track canvas */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    style={{ overflowX: "auto", overflowY: "auto" }}
                    className="bg-background"
                >
                    <div style={{ position: "relative", width: totalWidth, height: totalHeight }}>
                        {orderedTracks.map((track, i) => (
                            <TrackRow
                                key={track.id}
                                track={track}
                                recording={recording}
                                zoom={zoom}
                                top={i * TRACK_HEIGHT}
                            />
                        ))}
                        <RelationLayer
                            recording={recording}
                            zoom={zoom}
                            trackIndexMap={trackIndexMap}
                            showRemnants={showRemnants}
                            totalWidth={totalWidth}
                            totalHeight={totalHeight}
                        />
                    </div>
                </div>
            </div>

            {/* Inspector side panel */}
            <UoWInspector />
        </div>
    )
}

export default TimelineViewer
