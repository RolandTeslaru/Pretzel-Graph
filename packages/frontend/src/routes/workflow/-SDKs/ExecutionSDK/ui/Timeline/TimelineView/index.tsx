import { Execution } from "@pretzel-graph/shared/domain"
import { ExecutionSDK } from "../../../sdk"
import { resolveTimelineNodes } from "../../../selectors"
import { WorkbenchSDK } from "../../../../WorkbenchSDK/sdk"
import TimeRuler from "./TimeRuler"
import TrackRow from "./TrackRow"
import RelationLayer from "./RelationLayer"

const TimelineView = () => {

    const [tracks, totalHeight] = ExecutionSDK.useStore(s => [
        s.timeline.layout.tracks,
        s.timeline.layout.totalHeight,
    ])

    const { layout, scale, totalWidth, totalDuration } = ExecutionSDK.useStore(s => ({
        layout:        s.timeline.layout,
        scale:         s.timeline.scale,
        totalWidth:    s.timeline.totalWidth,
        totalDuration: s.timeline.totalDuration,
    }))
    const recording = ExecutionSDK.useStore(s => s.currentExecution?.recording ?? null)
    const workbenchNodes = WorkbenchSDK.useDocument(d => d.data.nodes)
    if (!recording) return null

    const nodes = resolveTimelineNodes(recording, workbenchNodes)
    const scrollWidth = totalWidth + Math.max(window.innerWidth, totalWidth)
    const { scrollRef, rulerRef } = ExecutionSDK.runtime.timeline

    return (
        <div className="flex h-full overflow-hidden min-w-[200vw]">
            {/* Main grid */}
            <div
                className="flex-1 overflow-hidden"
                style={{
                    display: "grid",
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
                    onScroll={ExecutionSDK.syncTimelineScroll}
                    style={{ overflowX: "auto", overflowY: "auto" }}
                    className="pl-[180px] pb-20"
                >
                    <div style={{ position: "relative", width: scrollWidth, height: totalHeight }}>
                        {tracks.map(tl => (
                            <TrackRow
                                key={tl.trackId}
                                trackLayout={tl}
                            />
                        ))}
                        <RelationLayer
                            nodes={nodes}
                            scale={scale}
                            layout={layout}
                            totalWidth={totalWidth}
                            totalHeight={layout.totalHeight}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TimelineView
