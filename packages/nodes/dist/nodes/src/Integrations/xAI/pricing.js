"use strict";
// xAI Grok model pricing in USD per 1M tokens.
// Source: https://x.ai/api
// Last verified: May 2026
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALIASES = exports.PRICES = void 0;
exports.PRICES = {
    // Grok 4.x series
    "grok-4": { input: 1.25, output: 2.50 },
    "grok-build-0.1": { input: 1.00, output: 2.00 }, // coding specialist
    // Grok 2.x series (legacy)
    "grok-2": { input: 2.00, output: 10.00 },
    "grok-2-mini": { input: 0.50, output: 2.00 },
};
// All grok-4 variants (grok-4.3, grok-4-fast, etc.) route to the same pricing.
exports.ALIASES = {
    "grok-4.3": "grok-4",
    "grok-4-fast": "grok-4",
};
