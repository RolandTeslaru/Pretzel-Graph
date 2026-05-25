import React from "react"
import { Execution } from "@pretzel-graph/shared/domain"
import type { Workflow } from "@pretzel-graph/shared/domain"
import UoWBlock from "./UoWBlock"
import type { TimeScale } from "./time-scale"
import type { TimelineTrackLayout } from "../../selectors"

interface TrackRowProps {
    trackLayout: TimelineTrackLayout
    recording:   Execution.Recording
    nodes:       Record<Workflow.Node.Id, Workflow.Node>
    scale:       TimeScale
}

const TrackRow = ({ trackLayout, recording, nodes, scale }: TrackRowProps) => {
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
            {track.unitIds.map(uowId => {
                const unit = recording.units[uowId]
                if (!unit) return null
                return (
                    <UoWBlock
                        key={uowId}
                        unit={unit}
                        scale={scale}
                        accent={accent}
                        height={blockHeight}
                        topOffset={Execution.Recording.Timeline.TRACK_PADDING_Y}
                    />
                )
            })}
        </div>
    )
}

export default TrackRow
