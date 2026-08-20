"use strict";
// Google Gemini model pricing in USD per 1M tokens.
// Source: https://ai.google.dev/gemini-api/docs/pricing
// Last verified: May 2026
//
// Note: Gemini 2.5 Pro and 3.1 Pro Preview have tiered input pricing —
// prompts >200k tokens cost more. The values below reflect the ≤200k tier.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALIASES = exports.PRICES = void 0;
exports.PRICES = {
    // Gemini 3.x series
    "gemini-3.5-flash": { input: 1.50, output: 9.00 },
    "gemini-3.1-pro-preview": { input: 2.00, output: 12.00 }, // >200k: $4/$18
    "gemini-3.1-flash-lite": { input: 0.25, output: 1.50 },
    // Gemini 2.5 series
    "gemini-2.5-pro": { input: 1.25, output: 10.00 }, // >200k: $2.50/$15
    "gemini-2.5-flash": { input: 0.30, output: 2.50 },
    "gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
    // Gemini 2.0 / 1.5 series (legacy)
    "gemini-2.0-flash": { input: 0.10, output: 0.40 },
    "gemini-1.5-pro": { input: 1.25, output: 5.00 },
    "gemini-1.5-flash": { input: 0.075, output: 0.30 },
};
// Google's SDK prefixes model IDs with "models/" — map those to canonical IDs.
exports.ALIASES = {
    "models/gemini-3.5-flash": "gemini-3.5-flash",
    "models/gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
    "models/gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
    "models/gemini-2.5-pro": "gemini-2.5-pro",
    "models/gemini-2.5-flash": "gemini-2.5-flash",
    "models/gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
    "models/gemini-2.0-flash": "gemini-2.0-flash",
    "models/gemini-1.5-pro": "gemini-1.5-pro",
    "models/gemini-1.5-flash": "gemini-1.5-flash",
};
