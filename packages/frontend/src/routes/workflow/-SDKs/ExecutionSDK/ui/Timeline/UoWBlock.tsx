import React from "react"
import { cn } from "@/utils/styleUtils"
import type { Recording } from "@pretzel-graph/shared/domain"
import { MIN_BLOCK_W, RUNNING_BLOCK_W, TRACK_HEIGHT } from "./constants"
import { ExecutionSDK } from "../../sdk"

interface UoWBlockProps {
    unit: Recording.UnitOfWork
    zoom: number
    accent?: string
}

const STATUS_CLASSES: Record<Recording.UnitOfWork.Status, string> = {
    running:   "opacity-80 animate-pulse",
    completed: "opacity-100",
    failed:    "opacity-90",
}

const UoWBlock = ({ unit, zoom, accent }: UoWBlockProps) => {
    const selectedUoW = ExecutionSDK.useStore(s => s.recordingViewer.selectedUoW)
    const isSelected = selectedUoW === unit.id

    const x = unit.startedAt * zoom
    const rawW = (unit.duration ?? 0) * zoom
    const w = unit.status === "running" ? RUNNING_BLOCK_W : Math.max(rawW, MIN_BLOCK_W)

    const baseColor = accent ?? "var(--primary)"
    const failColor = "var(--destructive)"
    const bgColor = unit.status === "failed" ? failColor : baseColor

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => ExecutionSDK.actions.recordingViewer.selectUoW(isSelected ? null : unit.id)}
            onKeyDown={e => e.key === "Enter" && ExecutionSDK.actions.recordingViewer.selectUoW(isSelected ? null : unit.id)}
            style={{
                position: "absolute",
                left: x,
                top: 6,
                width: w,
                height: TRACK_HEIGHT - 12,
                backgroundColor: bgColor,
                outline: isSelected ? `2px solid ${bgColor}` : undefined,
                outlineOffset: isSelected ? 2 : undefined,
            }}
            className={cn(
                "rounded cursor-pointer transition-opacity",
                STATUS_CLASSES[unit.status],
            )}
            title={`${unit.id} · ${unit.status}${unit.duration != null ? ` · ${unit.duration}ms` : ""}`}
        />
    )
}

export default UoWBlock
