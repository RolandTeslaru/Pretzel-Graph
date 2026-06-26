import React from "react"
import { cn } from "@/utils/styleUtils"
import { Execution } from "@pretzel-graph/shared/domain"
import { ExecutionSDK } from "../../../sdk"
import { useTimelineViewerStore, timelineViewerActions } from "../../../timeline-viewer-store"
import type { TimeScale } from "../time-scale"

interface UoWBlockProps {
    unitId:    Execution.Recording.UnitOfWork.Id
    scale:     TimeScale
    accent?:   string
    height:    number
    topOffset: number
}

const STATUS_CLASSES: Record<Execution.Recording.UnitOfWork.Status, string> = {
    running:   "opacity-80 animate-pulse",
    completed: "opacity-100",
    failed:    "opacity-90",
}

const UoWBlock = React.memo(({ unitId, scale, accent, height, topOffset }: UoWBlockProps) => {
    // Slice-subscribe to just this unit so a status tick on one UoW re-renders
    // only its block, independent of the parent TrackRow / the recording ref.
    // Immer structural-shares unchanged units, so this is reference-stable.
    const unit = ExecutionSDK.useStore(s => s.currentExecution?.recording?.units[unitId])
    const selectedUoW = useTimelineViewerStore(s => s.selectedUoW)
    if (!unit) return null
    const isSelected = selectedUoW === unit.id

    const x = scale.xFor(unit.startedAt)
    const rawW = scale.widthFor(unit.startedAt, unit.duration ?? 0)
    const w = unit.status === "running" ? Execution.Recording.Timeline.RUNNING_BLOCK_W : Math.max(rawW, Execution.Recording.Timeline.MIN_BLOCK_W)

    const backgroundColor = `color-mix(in srgb, var(--${accent}) 40%, var(--node-accent-base))`;
    const borderColor =  `color-mix(in srgb, var(--${accent}) 50%, var(--border))`;

    const baseColor = `var(--${accent ?? "primary"})`
    const failColor = "var(--destructive)"
    const bgColor = unit.status === "failed" ? failColor : baseColor

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => timelineViewerActions.selectUoW(isSelected ? null : unit.id)}
            onKeyDown={e => e.key === "Enter" && timelineViewerActions.selectUoW(isSelected ? null : unit.id)}
            style={{
                position: "absolute",
                left: x,
                top: topOffset,
                width: w,
                height,
                zIndex: 1,
                backgroundColor,
                border: `1px solid ${borderColor}`,
                outline: isSelected ? `2px solid ${bgColor}` : undefined,
                outlineOffset: isSelected ? 2 : undefined,
            }}
            className={cn(
                "rounded-xs cursor-pointer  transition-opacity",
                STATUS_CLASSES[unit.status],
            )}
            title={`${unit.id} · ${unit.status}${unit.duration != null ? ` · ${unit.duration}ms` : ""}`}
        />
    )
})

UoWBlock.displayName = "UoWBlock"

export default UoWBlock
