import React, { useMemo } from "react"
import { Execution } from "@pretzel-graph/shared/domain"
import type { Workflow } from "@pretzel-graph/shared/domain"
import type { TimeScale } from "../time-scale"
import type { TimelineLayout } from "../../../selectors"
import { ExecutionSDK } from "../../../sdk"
import { WorkbenchSDK } from "../../../../WorkbenchSDK/sdk"

interface RelationLayerProps {
    nodes:        Record<Workflow.Node.Id, Workflow.Node.Raw>
    scale:        TimeScale
    layout:       TimelineLayout
    totalWidth:   number
    totalHeight:  number
}

const RelationLayer = React.memo(({
    nodes,
    scale,
    layout,
    totalWidth,
    totalHeight,
}: RelationLayerProps) => {
    const [units, relations, showRemnants] = ExecutionSDK.useStore(s => [
        s.selectors.recording.getUnits(s),
        s.selectors.recording.getRelations(s),
        s.timeline.showRemnants,
    ])

    const arrows = useMemo(() => {
        if (!units || !relations) return []
        const subRow  = Execution.Recording.Timeline.UOW_PORT_HEIGHT
        const padY    = Execution.Recording.Timeline.TRACK_PADDING_Y

        return Object.values(relations).flatMap(rel => {
            if (rel.type === "dataRemnant" && !showRemnants) return []

            const srcUnit = units[rel.source]
            const tgtUnit = units[rel.target]
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
                ? Execution.Recording.Timeline.RUNNING_BLOCK_W
                : Math.max(scale.widthFor(srcUnit.startedAt, srcUnit.duration ?? 0), Execution.Recording.Timeline.MIN_BLOCK_W)

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
                const r = Math.min(8, vDist / 2, gap / 2)
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

            const srcNode   = nodes[srcUnit.trackId]
            const srcPort   = srcNode
                ? WorkbenchSDK.document.selectors.node.getOutputs(WorkbenchSDK.document, srcUnit.trackId).find(p => p.id === srcPortId)
                : undefined
            const portColor = srcPort ? `var(--port-${srcPort.variant})` : "var(--muted-foreground)"

            return [{
                id: rel.id,
                type: rel.type,
                d,
                color: portColor,
            }]
        })
    }, [units, relations, nodes, scale, layout, showRemnants])

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
                {arrows.map(arrow => (
                    <marker
                        key={`marker-${arrow.id}`}
                        id={`arrow-tip-${arrow.id}`}
                        markerWidth="4" markerHeight="4"
                        refX="3" refY="2"
                        orient="auto"
                    >
                        <path d="M0,0 L4,2 L0,4 Z" fill={arrow.color} fillOpacity={0.7} />
                    </marker>
                ))}
            </defs>
            {arrows.map(arrow => (
                <path
                    key={arrow.id}
                    d={arrow.d}
                    fill="none"
                    style={{
                        stroke: arrow.color,
                        strokeWidth: 1.5,
                        strokeOpacity: 0.7,
                        strokeDasharray: arrow.type === "dataRemnant" ? "4 3" : undefined,
                    }}
                    markerEnd={`url(#arrow-tip-${arrow.id})`}
                />
            ))}
        </svg>
    )
})

RelationLayer.displayName = "RelationLayer"

export default RelationLayer
