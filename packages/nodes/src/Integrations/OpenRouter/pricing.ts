// OpenRouter pricing.
//
// OpenRouter is a proxy that routes to many underlying providers.
// Per-model prices are dynamic and set by each provider — OpenRouter charges
// the same rate as the origin provider (plus optional markup per route).
//
// Model IDs on OpenRouter follow the form "<provider>/<model>" (e.g.
// "openai/gpt-4o", "anthropic/claude-opus-4-7"). The LanguageModel pricing
// aggregator will fall back to the underlying provider's price automatically
// once the prefix is stripped, so no static entries are needed here.
//
// Add entries below only for OpenRouter-specific or fine-tuned model IDs
// that don't resolve through the standard provider lookup.

export const PRICES: Record<string, { input: number; output: number }> = {}

export const ALIASES: Record<string, string> = {
    // Strip the OpenRouter provider prefix so the canonical lookup works.
    // Example: "openai/gpt-4o" -> "gpt-4o" is handled dynamically in the
    // normaliser, not via static aliases.
}
