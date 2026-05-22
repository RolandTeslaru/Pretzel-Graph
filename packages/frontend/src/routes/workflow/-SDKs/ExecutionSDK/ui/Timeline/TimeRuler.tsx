import React, { useMemo } from "react"
import { RULER_H, formatMs, tickIntervalMs } from "./constants"

interface TimeRulerProps {
    totalWidth: number
    zoom: number
    totalDuration: number
}

const TimeRuler = ({ totalWidth, zoom, totalDuration }: TimeRulerProps) => {
    const ticks = useMemo(() => {
        const interval = tickIntervalMs(zoom)
        const count = Math.floor(totalDuration / interval) + 1
        return Array.from({ length: count }, (_, i) => i * interval)
    }, [zoom, totalDuration])

    return (
        <div style={{ width: totalWidth, height: RULER_H, position: "relative" }} className="select-none">
            {ticks.map(ms => {
                const x = ms * zoom
                return (
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
                )
            })}
        </div>
    )
}

export default TimeRuler
