"use strict";
// OpenAI model pricing in USD per 1M tokens.
// Source: https://openai.com/api/pricing/
// Last verified: May 2026
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALIASES = exports.PRICES = void 0;
exports.PRICES = {
    "gpt-4o": { input: 2.50, output: 10.00 },
    "gpt-4o-mini": { input: 0.15, output: 0.60 },
    "gpt-4.1": { input: 2.00, output: 8.00 },
    "gpt-4-turbo": { input: 10.00, output: 30.00 },
    "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
    "o1": { input: 15.00, output: 60.00 },
    "o1-mini": { input: 3.00, output: 12.00 },
    "o3": { input: 2.00, output: 8.00 },
    "o3-mini": { input: 1.10, output: 4.40 },
    "o4-mini": { input: 1.10, output: 4.40 },
};
exports.ALIASES = {
    "gpt-4o-2024-08-06": "gpt-4o",
    "gpt-4o-mini-2024-07-18": "gpt-4o-mini",
    "gpt-4.1-2025-04-14": "gpt-4.1",
};
