export const TRACK_HEIGHT   = 44
export const TRACK_LABEL_W  = 160
export const RULER_H        = 28
export const MIN_BLOCK_W    = 6
export const RUNNING_BLOCK_W = 32

export function tickIntervalMs(pixelsPerMs: number): number {
    if (pixelsPerMs >= 2)   return 10
    if (pixelsPerMs >= 0.5) return 100
    if (pixelsPerMs >= 0.1) return 500
    return 1000
}

export function formatMs(ms: number): string {
    if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`
    return `${ms}ms`
}
