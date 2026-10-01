// Vercel AI Gateway pricing: gateway IDs resolve to the underlying provider's price once the "<provider>/" prefix is stripped.

export const PRICES: Record<string, { input: number; output: number }> = {}

export const ALIASES: Record<string, string> = {
    "anthropic/claude-haiku-4.5": "claude-haiku-4-5",
}
