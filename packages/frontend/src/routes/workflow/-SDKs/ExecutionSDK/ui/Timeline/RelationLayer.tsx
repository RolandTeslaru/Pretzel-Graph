import React, { useMemo } from "react"
import type { Recording, Workflow } from "@pretzel-graph/shared/domain"
import { MIN_BLOCK_W, RUNNING_BLOCK_W, TRACK_HEIGHT } from "./constants"
import type { TimeScale } from "./time-scale"

interface RelationLayerProps {
    recording: Recording
    nodes: Record<Workflow.Node.Id, Workflow.Node>
    scale: TimeScale
    trackIndexMap: Map<string, number>
    showRemnants: boolean
    totalWidth: number
    totalHeight: number
}

const RelationLayer = ({
    recording,
    nodes,
    scale,
    trackIndexMap,
    showRemnants,
    totalWidth,
    totalHeight,
}: RelationLayerProps) => {
    const arrows = useMemo(() => {
        return Object.values(recording.relations).flatMap(rel => {
            if (rel.type === "dataRemnant" && !showRemnants) return []

            const srcUnit = recording.units[rel.source]
            const tgtUnit = recording.units[rel.target]
            if (!srcUnit || !tgtUnit) return []

            const srcTrackIdx = trackIndexMap.get(srcUnit.trackId)
            const tgtTrackIdx = trackIndexMap.get(tgtUnit.trackId)
            if (srcTrackIdx == null || tgtTrackIdx == null) return []

            const srcW = srcUnit.status === "running"
                ? RUNNING_BLOCK_W
                : Math.max(scale.widthFor(srcUnit.startedAt, srcUnit.duration ?? 0), MIN_BLOCK_W)

            const sx = scale.xFor(srcUnit.startedAt) + srcW
            const sy = srcTrackIdx * TRACK_HEIGHT + TRACK_HEIGHT / 2
            const tx = scale.xFor(tgtUnit.startedAt)
            const ty = tgtTrackIdx * TRACK_HEIGHT + TRACK_HEIGHT / 2

            const signY = ty >= sy ? 1 : -1
            const vDist = Math.abs(ty - sy)
            const gap   = tx - sx

            let d: string

            if (vDist < 4) {
                d = `M ${sx},${sy} H ${tx}`
            } else if (gap >= 25) {
                // Enough horizontal room: clean L-shape — vertical at sx, round corner, horizontal to tx
                const r = Math.min(10, vDist / 2)
                d = `M ${sx},${sy} V ${ty - signY * r} Q ${sx},${ty} ${sx + r},${ty} H ${tx}`
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
    }, [recording, nodes, scale, trackIndexMap, showRemnants])

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
