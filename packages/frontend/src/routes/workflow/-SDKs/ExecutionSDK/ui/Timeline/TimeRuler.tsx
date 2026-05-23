import React, { useMemo } from "react"
import { RULER_H, formatMs, tickIntervalMs } from "./constants"
import type { TimeScale } from "./time-scale"

interface TimeRulerProps {
    totalWidth: number
    scale: TimeScale
    totalDuration: number
}

const TimeRuler = ({ totalWidth, scale, totalDuration }: TimeRulerProps) => {
    const ticks = useMemo(() => {
        // Pick a sensible tick interval. In equalize mode the on-screen density
        // varies, so use a heuristic based on totalWidth vs totalDuration.
        const effectivePxPerMs = totalDuration > 0 ? totalWidth / totalDuration : scale.zoom
        const interval = tickIntervalMs(effectivePxPerMs)
        const count = Math.floor(totalDuration / interval) + 1
        const raw = Array.from({ length: count }, (_, i) => ({
            ms: i * interval,
            x: scale.xFor(i * interval),
        }))
        // Drop labels that collide
        const MIN_GAP = 32
        const filtered: typeof raw = []
        let lastX = -Infinity
        for (const t of raw) {
            if (t.x - lastX >= MIN_GAP) {
                filtered.push(t)
                lastX = t.x
            }
        }
        return filtered
    }, [scale, totalDuration, totalWidth])

    return (
        <div style={{ width: totalWidth, height: RULER_H, position: "relative" }} className="select-none">
            {ticks.map(({ ms, x }) => (
                <div
                    key={ms}
                    style={{ position: "absolute", left: x, top: 0, height: "100%", transform: "translateX(-50%)" }}
                    className="flex flex-col items-center"
                >
                    <span className="text-[10px] text-muted-foreground leading-none pt-1 px-0.5 whitespace-nowrap">
                        {formatMs(ms)}
                    </span>
                    <div className="w-px flex-1 bg-border/60 mt-0.5" />
                </div>
            ))}
        </div>
    )
}

export default TimeRuler
