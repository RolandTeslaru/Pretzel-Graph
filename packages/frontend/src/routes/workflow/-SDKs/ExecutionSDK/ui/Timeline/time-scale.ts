import type { Recording } from "@pretzel-graph/shared/domain"

export type TimelineViewMode = "linear" | "equalize" | "step"

export const VIEW_MODES: TimelineViewMode[] = ["linear", "equalize", "step"]

export interface TimeScale {
    mode: TimelineViewMode
    zoom: number
    xFor: (ms: number) => number
    widthFor: (startMs: number, durationMs: number) => number
    totalWidth: number
}

// Equalize tunables
const ACTIVE_PX_PER_SQRT_MS = 6   // sqrt scaling for "busy" segments
const MIN_ACTIVE_SEG_W      = 12  // floor so tiny UoWs stay readable
const IDLE_SEG_W            = 12  // fixed compressed width for gaps

// Step tunables — discrete bucket widths assigned by relative duration
const STEP_WIDTHS    = [20, 40, 60, 80]
const STEP_IDLE_W    = 10

export function makeTimeScale(
    mode: TimelineViewMode,
    zoom: number,
    recording: Recording | null,
    totalDuration: number,
): TimeScale {
    if (mode === "linear" || !recording) {
        const xFor = (ms: number) => ms * zoom
        return {
            mode,
            zoom,
            xFor,
            widthFor: (_s, d) => d * zoom,
            totalWidth: totalDuration * zoom,
        }
    }
    if (mode === "step") {
        return buildStepScale(zoom, recording, totalDuration)
    }
    return buildEqualizeScale(zoom, recording, totalDuration)
}

function buildStepScale(zoom: number, recording: Recording, totalDuration: number): TimeScale {
    const finished = Object.values(recording.units).filter(u => u.status !== "running")
    if (finished.length === 0) {
        const xFor = (ms: number) => ms * zoom
        return {
            mode: "step",
            zoom,
            xFor,
            widthFor: (_s, d) => d * zoom,
            totalWidth: totalDuration * zoom,
        }
    }

    const maxDur = Math.max(1, ...finished.map(u => u.duration ?? 0))
    const N = STEP_WIDTHS.length

    // Step widths are absolute pixel tiers, but we still let zoom scale them
    // around 1× at the default zoom (0.2) so the +/- buttons feel consistent
    // across modes.
    const zoomFactor = zoom / 0.2
    const bucketFor = (d: number) => {
        if (d <= 0) return STEP_WIDTHS[0] * zoomFactor
        const idx = Math.min(N - 1, Math.max(0, Math.floor((d / maxDur) * N)))
        return STEP_WIDTHS[idx] * zoomFactor
    }

    const intervals = finished.map(u => {
        const d = Math.max(u.duration ?? 0, 0)
        return { s: u.startedAt, e: u.startedAt + d, d: Math.max(d, 1), bucket: bucketFor(d) }
    })

    const boundarySet = new Set<number>([0, totalDuration])
    for (const iv of intervals) {
        boundarySet.add(iv.s)
        boundarySet.add(iv.e)
    }
    const boundaries = [...boundarySet].sort((a, b) => a - b)

    type Seg = { t0: number; t1: number; x0: number; w: number }
    const segments: Seg[] = []
    let cumX = 0
    for (let i = 0; i < boundaries.length - 1; i++) {
        const t0 = boundaries[i]
        const t1 = boundaries[i + 1]
        const dt = t1 - t0
        if (dt <= 0) continue
        const mid = (t0 + t1) / 2
        const idleW = STEP_IDLE_W * zoomFactor
        let segW = idleW
        let anyActive = false
        for (const iv of intervals) {
            if (iv.s <= mid && iv.e >= mid) {
                const share = iv.bucket * (dt / iv.d)
                if (!anyActive || share > segW) segW = share
                anyActive = true
            }
        }
        if (!anyActive) segW = idleW
        segments.push({ t0, t1, x0: cumX, w: segW })
        cumX += segW
    }
    const totalWidth = cumX

    const xFor = makeXFor(segments, totalWidth)
    const widthFor = (startMs: number, durationMs: number) => {
        if (durationMs <= 0) return 0
        return xFor(startMs + durationMs) - xFor(startMs)
    }

    return { mode: "step", zoom, xFor, widthFor, totalWidth }
}

function makeXFor(segments: { t0: number; t1: number; x0: number; w: number }[], totalWidth: number) {
    return (ms: number): number => {
        if (segments.length === 0) return 0
        if (ms <= segments[0].t0) return 0
        const last = segments[segments.length - 1]
        if (ms >= last.t1) return totalWidth
        let lo = 0, hi = segments.length - 1
        while (lo <= hi) {
            const m = (lo + hi) >> 1
            const seg = segments[m]
            if (ms < seg.t0) hi = m - 1
            else if (ms > seg.t1) lo = m + 1
            else {
                const span = seg.t1 - seg.t0
                const frac = span > 0 ? (ms - seg.t0) / span : 0
                return seg.x0 + frac * seg.w
            }
        }
        return 0
    }
}

function buildEqualizeScale(zoom: number, recording: Recording, totalDuration: number): TimeScale {
    const units = Object.values(recording.units)

    const intervals = units
        .filter(u => u.status !== "running")
        .map(u => ({
            s: u.startedAt,
            e: u.startedAt + (u.duration ?? 0),
        }))

    const boundarySet = new Set<number>([0, totalDuration])
    for (const u of units) {
        boundarySet.add(u.startedAt)
        if (u.status !== "running") {
            boundarySet.add(u.startedAt + (u.duration ?? 0))
        }
    }
    const boundaries = [...boundarySet].sort((a, b) => a - b)

    type Seg = { t0: number; t1: number; x0: number; w: number }
    const segments: Seg[] = []
    let cumX = 0
    for (let i = 0; i < boundaries.length - 1; i++) {
        const t0 = boundaries[i]
        const t1 = boundaries[i + 1]
        const dt = t1 - t0
        if (dt <= 0) continue
        const mid = (t0 + t1) / 2
        const isActive = intervals.some(iv => iv.s <= mid && iv.e >= mid)
        const w = isActive
            ? Math.max(Math.sqrt(dt) * ACTIVE_PX_PER_SQRT_MS * zoom, MIN_ACTIVE_SEG_W)
            : IDLE_SEG_W
        segments.push({ t0, t1, x0: cumX, w })
        cumX += w
    }
    const totalWidth = cumX

    const xFor = makeXFor(segments, totalWidth)
    const widthFor = (startMs: number, durationMs: number) => {
        if (durationMs <= 0) return 0
        return xFor(startMs + durationMs) - xFor(startMs)
    }

    return { mode: "equalize", zoom, xFor, widthFor, totalWidth }
}
