import { useMemo, useRef } from "react"
import type { Execution, Workflow } from "@pretzel-graph/shared/domain"
import { getTimelineLayout, getTotalDuration } from "../../selectors"
import type { TimelineLayout, TimelineTrackLayout } from "../../selectors"
import { useTimelineViewerStore } from "../../timeline-viewer-store"
import { WorkbenchSDK } from "../../../WorkbenchSDK/sdk"
import { makeTimeScale } from "./time-scale"
import type { TimeScale } from "./time-scale"

export interface TimelineGeometry {
    nodes:         Record<Workflow.Node.Id, Workflow.Node>
    layout:        TimelineLayout
    scale:         TimeScale
    totalDuration: number
    totalWidth:    number
    scrollWidth:   number
    totalHeight:   number
}

export const useTimelineGeometry = (recording: Execution.Recording | null): TimelineGeometry => {
    const [zoom, viewMode] = useTimelineViewerStore(s => [s.zoom, s.viewMode])

    const workbenchNodes = WorkbenchSDK.useStore(s => s.data.nodes)
    const snapshotNodes = recording?.workflowDataSnapshot?.nodes
    const nodes = (snapshotNodes && Object.keys(snapshotNodes).length > 0) ? snapshotNodes : workbenchNodes

    // Per-track layout cache for structural sharing — keeps unchanged tracks'
    // layout objects reference-stable so the memoized TrackRows bail on a tick.
    const layoutCacheRef = useRef<Map<Workflow.Node.Id, TimelineTrackLayout>>(new Map())
    const layout        = useMemo(() => getTimelineLayout(recording, nodes, layoutCacheRef.current), [recording, nodes])
    const totalDuration = useMemo(() => getTotalDuration(recording),         [recording])

    // In linear mode the scale fns (xFor/widthFor) are pure `ms * zoom` — they
    // don't read `recording` or `totalDuration`. Excluding those from the deps
    // keeps `scale` reference-stable across streaming events so the memoized
    // UoWBlocks don't all re-render on every UoW update. step/equalize genuinely
    // depend on unit data, so they keep the full deps.
    const scaleRecordingDep = viewMode === "linear" ? null : recording
    const scaleDurationDep  = viewMode === "linear" ? 0    : totalDuration
    const scale = useMemo(
        () => makeTimeScale(viewMode, zoom, recording, totalDuration),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [viewMode, zoom, scaleRecordingDep, scaleDurationDep],
    )

    // scale is intentionally stale in linear mode (see scale memo), so derive the
    // live container width from totalDuration there instead of scale.totalWidth.
    const scaleTotalWidth = viewMode === "linear" ? totalDuration * zoom : scale.totalWidth
    const totalWidth  = Math.max(scaleTotalWidth + 80, 400)
    const scrollWidth = totalWidth + Math.max(window.innerWidth, totalWidth)
    const totalHeight = layout.totalHeight

    return { nodes, layout, scale, totalDuration, totalWidth, scrollWidth, totalHeight }
}
