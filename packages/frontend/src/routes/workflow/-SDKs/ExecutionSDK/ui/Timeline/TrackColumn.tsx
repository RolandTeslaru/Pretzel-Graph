import React from "react"
import type { Workflow } from "@pretzel-graph/shared/domain"
import { LazyIcon } from "@pretzel-graph/standard-ui/icons/LazyIcon"
import type { TimelineLayout } from "../../selectors"
import { WorkbenchSDK } from "../../../WorkbenchSDK/sdk"

interface TrackColumnProps {
    layout: TimelineLayout
    nodes:  Record<Workflow.Node.Id, Workflow.Node.Raw>
}

const TrackColumn = ({ layout, nodes }: TrackColumnProps) => {
    return (
        <div style={{ position: "relative", height: layout.totalHeight }}>
            {layout.tracks.map(tl => {
                // Unguarded: a deleted track node falls back to the red "node-unknown" UI
                // (shield icon + "Unknown Node") instead of a bare, unlabeled row.
                const ui = WorkbenchSDK.state.selectors.node.getUI(WorkbenchSDK.state, tl.trackId)
                const label = ui.displayName

                return (
                    <div
                        key={tl.trackId}
                        style={{ position: "absolute", top: tl.top, height: tl.height, left: 0, right: 0 }}
                        className="flex items-center gap-2 px-1 border-b border-border/50"
                    >
                        {ui?.icon && (
                            <LazyIcon
                                className={`w-3 h-3`}
                                name={ui.icon}
                                style={{ color: `var(--${ui.accent}-foreground)` }}
                            />
                        )}
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
