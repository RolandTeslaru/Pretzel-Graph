// Anthropic Claude model pricing in USD per 1M tokens.
// Source: https://platform.claude.com/docs/en/about-claude/pricing
// Last verified: May 2026
//
// Note: Opus 4.7 uses a new tokenizer that may consume up to 35% more tokens
// for equivalent input text compared to prior models.

export const PRICES: Record<string, { input: number; output: number }> = {
    // Claude 4.x series
    "claude-opus-4-7":   { input:  5.00, output: 25.00 },
    "claude-opus-4-6":   { input:  5.00, output: 25.00 },
    "claude-opus-4-5":   { input:  5.00, output: 25.00 },
    "claude-opus-4-1":   { input: 15.00, output: 75.00 },
    "claude-sonnet-4-6": { input:  3.00, output: 15.00 },
    "claude-sonnet-4-5": { input:  3.00, output: 15.00 },
    "claude-haiku-4-5":  { input:  1.00, output:  5.00 },
    // Claude 3.x series (deprecated / retired)
    "claude-3-5-sonnet": { input:  3.00, output: 15.00 },
    "claude-3-5-haiku":  { input:  0.80, output:  4.00 },
    "claude-3-opus":     { input: 15.00, output: 75.00 },
}

export const ALIASES: Record<string, string> = {
    "claude-opus-4-7-latest":      "claude-opus-4-7",
    "claude-opus-4-6-latest":      "claude-opus-4-6",
    "claude-opus-4-5-latest":      "claude-opus-4-5",
    "claude-opus-4-1-latest":      "claude-opus-4-1",
    "claude-sonnet-4-6-latest":    "claude-sonnet-4-6",
    "claude-sonnet-4-5-latest":    "claude-sonnet-4-5",
    "claude-haiku-4-5-latest":     "claude-haiku-4-5",
    "claude-haiku-4-5-20251001":   "claude-haiku-4-5",
    "claude-3-5-sonnet-latest":    "claude-3-5-sonnet",
    "claude-3-5-sonnet-20241022":  "claude-3-5-sonnet",
    "claude-3-5-haiku-latest":     "claude-3-5-haiku",
    "claude-3-5-haiku-20241022":   "claude-3-5-haiku",
    "claude-3-opus-latest":        "claude-3-opus",
}
