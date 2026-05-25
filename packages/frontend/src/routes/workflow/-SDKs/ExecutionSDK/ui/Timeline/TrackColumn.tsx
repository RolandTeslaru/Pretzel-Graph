import React from "react"
import type { Workflow } from "@pretzel-graph/shared/domain"
import { LazyIcon } from "@pretzel-graph/standard-ui/icons/LazyIcon"
import type { TimelineLayout } from "../../selectors"

interface TrackColumnProps {
    layout: TimelineLayout
    nodes:  Record<Workflow.Node.Id, Workflow.Node>
}

const TrackColumn = ({ layout, nodes }: TrackColumnProps) => {
    return (
        <div style={{ position: "relative", height: layout.totalHeight }}>
            {layout.tracks.map(tl => {
                const node = nodes[tl.track.id]
                const label = node?.displayName ?? tl.track.id

                return (
                    <div
                        key={tl.track.id}
                        style={{ position: "absolute", top: tl.top, height: tl.height, left: 0, right: 0 }}
                        className="flex items-center gap-2 px-1 border-b border-border/50"
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
