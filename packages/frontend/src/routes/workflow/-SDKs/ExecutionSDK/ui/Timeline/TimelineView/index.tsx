import { Execution } from "@pretzel-graph/shared/domain"
import { useTimelineFrame } from "../frame-context"
import TimeRuler from "./TimeRuler"
import TrackRow from "./TrackRow"
import RelationLayer from "./RelationLayer"

const TimelineView = () => {
    const {
        rulerRef,
        scrollRef,
        onScroll,
        recording,
        nodes,
        layout,
        scale,
        totalDuration,
        totalWidth,
        scrollWidth,
        totalHeight,
    } = useTimelineFrame()

    return (
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
                    onScroll={onScroll}
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
                            totalWidth={totalWidth}
                            totalHeight={totalHeight}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TimelineView
