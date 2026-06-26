import React from "react"
import { Execution } from "@pretzel-graph/shared/domain"
import type { Workflow } from "@pretzel-graph/shared/domain"
import UoWBlock from "./UoWBlock"
import type { TimeScale } from "../time-scale"
import type { TimelineTrackLayout } from "../../../selectors"

interface TrackRowProps {
    trackLayout: TimelineTrackLayout
    nodes:       Record<Workflow.Node.Id, Workflow.Node>
    scale:       TimeScale
}

const TrackRow = React.memo(({ trackLayout, nodes, scale }: TrackRowProps) => {
    const { track, top, height, blockHeight } = trackLayout
    const node   = nodes[track.id]
    const accent = node?.accent ?? undefined

    return (
        <div
            style={{
                position: "absolute",
                top,
                left: 0,
                right: 0,
                height,
            }}
            className="border-b border-border/50"
        >
            {track.unitIds.map(uowId => (
                <UoWBlock
                    key={uowId}
                    unitId={uowId}
                    scale={scale}
                    accent={accent}
                    height={blockHeight}
                    topOffset={Execution.Recording.Timeline.TRACK_PADDING_Y}
                />
            ))}
        </div>
    )
})

TrackRow.displayName = "TrackRow"

export default TrackRow
