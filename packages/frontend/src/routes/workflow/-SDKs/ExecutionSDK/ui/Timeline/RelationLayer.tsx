import React, { useMemo } from "react"
import { Recording } from "@pretzel-graph/shared/domain"
import type { Workflow } from "@pretzel-graph/shared/domain"
import type { TimeScale } from "./time-scale"
import type { TimelineLayout } from "../../selectors"

interface RelationLayerProps {
    recording:    Recording
    nodes:        Record<Workflow.Node.Id, Workflow.Node>
    scale:        TimeScale
    layout:       TimelineLayout
    showRemnants: boolean
    totalWidth:   number
    totalHeight:  number
}

const RelationLayer = ({
    recording,
    nodes,
    scale,
    layout,
    showRemnants,
    totalWidth,
    totalHeight,
}: RelationLayerProps) => {
    const arrows = useMemo(() => {
        const subRow  = Recording.Timeline.UOW_PORT_HEIGHT
        const padY    = Recording.Timeline.TRACK_PADDING_Y

        return Object.values(recording.relations).flatMap(rel => {
            if (rel.type === "dataRemnant" && !showRemnants) return []

            const srcUnit = recording.units[rel.source]
            const tgtUnit = recording.units[rel.target]
            if (!srcUnit || !tgtUnit) return []

            const srcLayout = layout.byTrackId.get(srcUnit.trackId)
            const tgtLayout = layout.byTrackId.get(tgtUnit.trackId)
            if (!srcLayout || !tgtLayout) return []

            // Edge IDs are formatted srcNode|srcPort|tgtNode|tgtPort
            // — parse directly so we don't depend on workflowDataSnapshot,
            // which isn't populated during live streaming.
            const parts = rel.edge.split("|")
            const srcPortId = parts[1]
            const tgtPortId = parts[3]
            const srcPortIdx = srcLayout.outputPorts.indexOf(srcPortId as any)
            const tgtPortIdx = tgtLayout.inputPorts.indexOf(tgtPortId as any)
            const srcRow = srcPortIdx >= 0 ? srcPortIdx : 0
            const tgtRow = tgtPortIdx >= 0 ? tgtPortIdx : 0

            const srcW = srcUnit.status === "running"
                ? Recording.Timeline.RUNNING_BLOCK_W
                : Math.max(scale.widthFor(srcUnit.startedAt, srcUnit.duration ?? 0), Recording.Timeline.MIN_BLOCK_W)

            const sx = scale.xFor(srcUnit.startedAt) + srcW
            const sy = srcLayout.top + padY + srcRow * subRow + subRow / 2
            const tx = scale.xFor(tgtUnit.startedAt)
            const ty = tgtLayout.top + padY + tgtRow * subRow + subRow / 2

            const signY = ty >= sy ? 1 : -1
            const vDist = Math.abs(ty - sy)
            const gap   = tx - sx

            let d: string

            if (vDist < 4) {
                d = `M ${sx},${sy} H ${tx}`
            } else if (gap >= 25) {
                // Enough horizontal room: right → down → right (orthogonal elbow)
                const midX = sx + gap / 2
                const r = Math.min(10, vDist / 2, gap / 2)
                d = [
                    `M ${sx},${sy}`,
                    `H ${midX - r}`,
                    `Q ${midX},${sy} ${midX},${sy + signY * r}`,
                    `V ${ty - signY * r}`,
                    `Q ${midX},${ty} ${midX + r},${ty}`,
                    `H ${tx}`,
                ].join(' ')
            } else {
                // Not enough room (or backward): Z/step route — 90°, 90°, 270°, 90° bends
                // Right → down to midY → step left → down to ty → enter target right
                const stepX  = sx + 15           // overflow past source right edge
                const backX  = tx - 10           // approach target from 10px left
                const midY   = (sy + ty) / 2
                const hSpace = stepX - backX     // how wide the horizontal step-back is
                const cr     = Math.min(5, vDist / 4, Math.max(0, (hSpace - 1) / 2))
                d = [
                    `M ${sx},${sy}`,
                    `H ${stepX - cr}`,
                    `Q ${stepX},${sy} ${stepX},${sy + signY * cr}`,
                    `V ${midY - signY * cr}`,
                    `Q ${stepX},${midY} ${stepX - cr},${midY}`,
                    `H ${backX + cr}`,
                    `Q ${backX},${midY} ${backX},${midY + signY * cr}`,
                    `V ${ty - signY * cr}`,
                    `Q ${backX},${ty} ${backX + cr},${ty}`,
                    `H ${tx}`,
                ].join(' ')
            }

            return [{
                id: rel.id,
                type: rel.type,
                d,
                accent: nodes[srcUnit.trackId]?.accent,
            }]
        })
    }, [recording, nodes, scale, layout, showRemnants])

    if (arrows.length === 0) return null

    return (
        <svg
            style={{
                position: "absolute",
                inset: 0,
                width: totalWidth,
                height: totalHeight,
                pointerEvents: "none",
                overflow: "visible",
                zIndex: 0,
            }}
        >
            <defs>
                {arrows.map(arrow => {
                    const color = arrow.accent ? `var(--${arrow.accent})` : "var(--muted-foreground)"
                    return (
                        <marker
                            key={`marker-${arrow.id}`}
                            id={`arrow-tip-${arrow.id}`}
                            markerWidth="6" markerHeight="6"
                            refX="5" refY="3"
                            orient="auto"
                        >
                            <path d="M0,0 L6,3 L0,6 Z" fill={color} fillOpacity={0.7} />
                        </marker>
                    )
                })}
            </defs>
            {arrows.map(arrow => (
                <path
                    key={arrow.id}
                    d={arrow.d}
                    fill="none"
                    style={{
                        stroke: arrow.accent ? `var(--${arrow.accent})` : "var(--muted-foreground)",
                        strokeWidth: 1.5,
                        strokeOpacity: 0.7,
                        strokeDasharray: arrow.type === "dataRemnant" ? "4 3" : undefined,
                    }}
                    markerEnd={`url(#arrow-tip-${arrow.id})`}
                />
            ))}
        </svg>
    )
}

export default RelationLayer
