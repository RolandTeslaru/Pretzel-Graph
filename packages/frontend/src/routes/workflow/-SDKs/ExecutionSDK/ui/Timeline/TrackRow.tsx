import React from "react"
import type { Recording, Workflow } from "@pretzel-graph/shared/domain"
import UoWBlock from "./UoWBlock"
import type { TimeScale } from "./time-scale"

interface TrackRowProps {
    track:     Recording.Track
    recording: Recording
    nodes:     Record<Workflow.Node.Id, Workflow.Node>
    scale:     TimeScale
    top:       number
    height:    number
}

const TrackRow = ({ track, recording, nodes, scale, top, height }: TrackRowProps) => {
    const node = nodes[track.id]
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
                        height={height}
                    />
                )
            })}
        </div>
    )
}

export default TrackRow
