import React, { useMemo } from "react"
import type { Recording } from "@pretzel-graph/shared/domain"
import { MIN_BLOCK_W, RUNNING_BLOCK_W, TRACK_HEIGHT } from "./constants"

interface RelationLayerProps {
    recording: Recording
    zoom: number
    trackIndexMap: Map<string, number>
    showRemnants: boolean
    totalWidth: number
    totalHeight: number
}

const RelationLayer = ({
    recording,
    zoom,
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
                : Math.max((srcUnit.duration ?? 0) * zoom, MIN_BLOCK_W)

            const sx = srcUnit.startedAt * zoom + srcW
            const sy = srcTrackIdx * TRACK_HEIGHT + TRACK_HEIGHT / 2
            const tx = tgtUnit.startedAt * zoom
            const ty = tgtTrackIdx * TRACK_HEIGHT + TRACK_HEIGHT / 2

            const midX = (sx + tx) / 2

            return [{
                id: rel.id,
                type: rel.type,
                d: `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`,
                accent: recording.workflowDataSnapshot.nodes[srcUnit.trackId]?.accent,
            }]
        })
    }, [recording, zoom, trackIndexMap, showRemnants])

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
                <marker id="arrow-tip" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" className="text-muted-foreground" />
                </marker>
            </defs>
            {arrows.map(arrow => (
                <path
                    key={arrow.id}
                    d={arrow.d}
                    fill="none"
                    stroke={arrow.accent ?? "var(--muted-foreground)"}
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                    strokeDasharray={arrow.type === "dataRemnant" ? "4 3" : undefined}
                    markerEnd="url(#arrow-tip)"
                />
            ))}
        </svg>
    )
}

export default RelationLayer
