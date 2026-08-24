// OpenAI model pricing in USD per 1M tokens.
// Source: https://openai.com/api/pricing/
// Last verified: August 2026 (5.x rows); May 2026 (older rows)

export const PRICES: Record<string, { input: number; output: number }> = {
    "gpt-5.6-sol":   { input:  5.00, output: 30.00 },
    "gpt-5.6-terra": { input:  2.00, output: 12.00 },
    "gpt-5.6-luna":  { input:  0.20, output:  1.20 },
    "gpt-5.5":       { input:  5.00, output: 30.00 },
    "gpt-5.4":       { input:  2.50, output: 15.00 },
    "gpt-5.4-nano":  { input:  0.20, output:  1.25 },
    "gpt-4o":        { input:  2.50, output: 10.00 },
    "gpt-4o-mini":   { input:  0.15, output:  0.60 },
    "gpt-4.1":       { input:  2.00, output:  8.00 },
    "gpt-4-turbo":   { input: 10.00, output: 30.00 },
    "gpt-3.5-turbo": { input:  0.50, output:  1.50 },
    "o1":            { input: 15.00, output: 60.00 },
    "o1-mini":       { input:  3.00, output: 12.00 },
    "o3":            { input:  2.00, output:  8.00 },
    "o3-mini":       { input:  1.10, output:  4.40 },
    "o4-mini":       { input:  1.10, output:  4.40 },
}

export const ALIASES: Record<string, string> = {
    "gpt-4o-2024-08-06":    "gpt-4o",
    "gpt-4o-mini-2024-07-18": "gpt-4o-mini",
    "gpt-4.1-2025-04-14":   "gpt-4.1",
}
