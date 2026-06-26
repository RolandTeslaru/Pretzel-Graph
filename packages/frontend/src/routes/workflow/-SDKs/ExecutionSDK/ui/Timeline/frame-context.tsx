import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react"
import type { Execution } from "@pretzel-graph/shared/domain"
import { useTimelineGeometry, type TimelineGeometry } from "./useTimelineGeometry"

interface TimelineFrame extends TimelineGeometry {
    recording:     Execution.Recording
    scrollRef:     RefObject<HTMLDivElement | null>
    rulerRef:      RefObject<HTMLDivElement | null>
    labelsRef:     RefObject<HTMLDivElement | null>
    onScroll:      () => void
    onLabelScroll: () => void
}

const TimelineFrameContext = createContext<TimelineFrame | null>(null)

export const useTimelineFrame = (): TimelineFrame => {
    const ctx = useContext(TimelineFrameContext)
    if (!ctx) throw new Error("useTimelineFrame must be used within a TimelineFrameProvider")
    return ctx
}

export const TimelineFrameProvider = ({ recording, children }: { recording: Execution.Recording; children: ReactNode }) => {
    const geometry = useTimelineGeometry(recording)

    const scrollRef = useRef<HTMLDivElement>(null)
    const rulerRef  = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)

    const onScroll = useCallback(() => {
        const sc = scrollRef.current
        if (!sc) return
        if (rulerRef.current)  rulerRef.current.scrollLeft  = sc.scrollLeft
        if (labelsRef.current) labelsRef.current.scrollTop  = sc.scrollTop
    }, [])

    const onLabelScroll = useCallback(() => {
        const lb = labelsRef.current
        if (!lb) return
        if (scrollRef.current) scrollRef.current.scrollTop = lb.scrollTop
    }, [])

    const value = useMemo<TimelineFrame>(
        () => ({ recording, ...geometry, scrollRef, rulerRef, labelsRef, onScroll, onLabelScroll }),
        [recording, geometry, onScroll, onLabelScroll],
    )

    return <TimelineFrameContext.Provider value={value}>{children}</TimelineFrameContext.Provider>
}
