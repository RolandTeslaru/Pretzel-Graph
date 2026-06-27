import type { Execution } from '@pretzel-graph/shared/domain'

/** Formats a millisecond duration into a compact human-readable string. */
export function formatDuration(ms: number | undefined): string {
    if (ms === undefined) return '—'
    if (ms < 1)    return '< 1ms'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
}

/** Formats a ms-from-origin timestamp as a relative offset string. */
export function formatStartedAt(ms: number): string {
    if (ms < 1000) return `+${Math.round(ms)}ms`
    return `+${(ms / 1000).toFixed(2)}s`
}

export function formatMetric(metric: Execution.Recording.Metric): string {
    switch (metric.type) {
        case "duration_ms":  return typeof metric.value === "number" ? formatDuration(metric.value) : String(metric.value)
        case "currency_usd": return typeof metric.value === "number" ? `$${metric.value.toFixed(6)}` : String(metric.value)
        case "tokens":       return typeof metric.value === "number" ? metric.value.toLocaleString() : String(metric.value)
        case "number":       return typeof metric.value === "number" ? metric.value.toLocaleString() : String(metric.value)
        case "string":
        default:             return String(metric.value)
    }
}
