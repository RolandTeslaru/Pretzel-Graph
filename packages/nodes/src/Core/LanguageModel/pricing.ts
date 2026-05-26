// Central pricing aggregator — imports per-provider tables and merges them.
// To add or update prices for a specific provider, edit its own pricing.ts:
//
//   Integrations/OpenAI/pricing.ts
//   Integrations/Anthropic/pricing.ts
//   Integrations/Google/Gemini/pricing.ts
//   Integrations/xAI/pricing.ts
//   Integrations/OpenRouter/pricing.ts

import * as OpenAI     from "../../Integrations/OpenAI/pricing";
import * as Anthropic  from "../../Integrations/Anthropic/pricing";
import * as Gemini     from "../../Integrations/Google/Gemini/pricing";
import * as XAI        from "../../Integrations/xAI/pricing";
import * as OpenRouter from "../../Integrations/OpenRouter/pricing";

export interface ModelPrice {
    input:  number  // USD per 1M input tokens
    output: number  // USD per 1M output tokens
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
    ...OpenAI.PRICES,
    ...Anthropic.PRICES,
    ...Gemini.PRICES,
    ...XAI.PRICES,
    ...OpenRouter.PRICES,
}

const ALIASES: Record<string, string> = {
    ...OpenAI.ALIASES,
    ...Anthropic.ALIASES,
    ...Gemini.ALIASES,
    ...XAI.ALIASES,
    ...OpenRouter.ALIASES,
}

function normalise(modelId: string): string {
    if (ALIASES[modelId]) return ALIASES[modelId]

    // OpenRouter model IDs are prefixed with "<provider>/" — strip it so the
    // canonical lookup hits the underlying provider's entry.
    const slashIdx = modelId.indexOf("/")
    if (slashIdx !== -1) return modelId.slice(slashIdx + 1)

    return modelId
}

export function lookupModelPrice(modelId: string | undefined): ModelPrice | undefined {
    if (!modelId) return undefined
    const canonical = normalise(modelId)
    if (MODEL_PRICES[canonical]) return MODEL_PRICES[canonical]

    // Fallback: strip a trailing date suffix ("-20241022") or "-latest".
    const stripped = canonical.replace(/-\d{8}$/, "").replace(/-latest$/, "")
    return MODEL_PRICES[stripped]
}

export interface ComputedCost {
    inputUsd:  number
    outputUsd: number
    totalUsd:  number
}

export function computeCost(
    modelId:      string | undefined,
    inputTokens:  number | undefined,
    outputTokens: number | undefined,
): ComputedCost | undefined {
    const price = lookupModelPrice(modelId)
    if (!price) return undefined
    if (typeof inputTokens !== "number" && typeof outputTokens !== "number") return undefined

    const inputUsd  = ((inputTokens  ?? 0) / 1_000_000) * price.input
    const outputUsd = ((outputTokens ?? 0) / 1_000_000) * price.output
    return {
        inputUsd,
        outputUsd,
        totalUsd: inputUsd + outputUsd,
    }
}
