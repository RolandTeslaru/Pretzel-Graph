import React from "react"
import type { Recording, Workflow } from "@pretzel-graph/shared/domain"
import { TRACK_HEIGHT } from "./constants"
import { LazyIcon } from "@pretzel-graph/standard-ui/icons/LazyIcon"

interface TrackColumnProps {
    tracks: Recording.Track[]
    nodes: Record<Workflow.Node.Id, Workflow.Node>
}

const TrackColumn = ({ tracks, nodes }: TrackColumnProps) => {
    return (
        <div>
            {tracks.map(track => {
                const node = nodes[track.id]
                const label = node?.displayName ?? track.id
                const accent = node?.accent ?? undefined

                return (
                    <div
                        key={track.id}
                        style={{ height: TRACK_HEIGHT }}
                        className="flex items-center gap-2 border-b border-border/20"
                    >
                        <LazyIcon
                            className={`w-3 h-3`}
                            name={node.icon as string}
                            style={{ color: `var(--${node.accent}-foreground)` }}
                            />
                        <span className="text-[10px] text-foreground font-medium  ml-auto truncate leading-none">
                            {label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default TrackColumn
