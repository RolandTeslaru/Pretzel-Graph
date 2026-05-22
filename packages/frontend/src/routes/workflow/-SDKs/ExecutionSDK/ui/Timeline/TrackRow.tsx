import React from "react"
import type { Recording } from "@pretzel-graph/shared/domain"
import { TRACK_HEIGHT } from "./constants"
import UoWBlock from "./UoWBlock"

interface TrackRowProps {
    track: Recording.Track
    recording: Recording
    zoom: number
    top: number
}

const TrackRow = ({ track, recording, zoom, top }: TrackRowProps) => {
    const node = recording.workflowDataSnapshot.nodes[track.id]
    const accent = node?.accent ?? undefined

    return (
        <div
            style={{
                position: "absolute",
                top,
                left: 0,
                right: 0,
                height: TRACK_HEIGHT,
            }}
            className="border-b border-border/30"
        >
            {track.unitIds.map(uowId => {
                const unit = recording.units[uowId]
                if (!unit) return null
                return (
                    <UoWBlock
                        key={uowId}
                        unit={unit}
                        zoom={zoom}
                        accent={accent}
                    />
                )
            })}
        </div>
    )
}

export default TrackRow
