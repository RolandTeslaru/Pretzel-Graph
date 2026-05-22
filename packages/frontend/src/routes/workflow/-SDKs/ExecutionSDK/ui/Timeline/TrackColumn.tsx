import React from "react"
import type { Recording } from "@pretzel-graph/shared/domain"
import { TRACK_HEIGHT } from "./constants"

interface TrackColumnProps {
    tracks: Recording.Track[]
    recording: Recording
}

const TrackColumn = ({ tracks, recording }: TrackColumnProps) => {
    return (
        <div>
            {tracks.map(track => {
                const node = recording.workflowDataSnapshot.nodes[track.id]
                const label = node?.displayName ?? track.id
                const accent = node?.accent ?? undefined

                return (
                    <div
                        key={track.id}
                        style={{ height: TRACK_HEIGHT }}
                        className="flex items-center gap-2 px-3 border-b border-border/50"
                    >
                        {accent && (
                            <div
                                className="size-2 rounded-full shrink-0"
                                style={{ backgroundColor: accent }}
                            />
                        )}
                        <span className="text-xs text-foreground truncate leading-none">
                            {label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default TrackColumn
