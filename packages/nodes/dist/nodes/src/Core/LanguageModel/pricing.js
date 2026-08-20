"use strict";
// Central pricing aggregator — imports per-provider tables and merges them.
// To add or update prices for a specific provider, edit its own pricing.ts:
//
//   Integrations/OpenAI/pricing.ts
//   Integrations/Anthropic/pricing.ts
//   Integrations/Google/Gemini/pricing.ts
//   Integrations/xAI/pricing.ts
//   Integrations/OpenRouter/pricing.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PRICES = void 0;
exports.lookupModelPrice = lookupModelPrice;
exports.computeCost = computeCost;
const OpenAI = __importStar(require("../../Integrations/OpenAI/pricing"));
const Anthropic = __importStar(require("../../Integrations/Anthropic/pricing"));
const Gemini = __importStar(require("../../Integrations/Google/Gemini/pricing"));
const XAI = __importStar(require("../../Integrations/xAI/pricing"));
const OpenRouter = __importStar(require("../../Integrations/OpenRouter/pricing"));
exports.MODEL_PRICES = {
    ...OpenAI.PRICES,
    ...Anthropic.PRICES,
    ...Gemini.PRICES,
    ...XAI.PRICES,
    ...OpenRouter.PRICES,
};
const ALIASES = {
    ...OpenAI.ALIASES,
    ...Anthropic.ALIASES,
    ...Gemini.ALIASES,
    ...XAI.ALIASES,
    ...OpenRouter.ALIASES,
};
function normalise(modelId) {
    if (ALIASES[modelId])
        return ALIASES[modelId];
    // OpenRouter model IDs are prefixed with "<provider>/" — strip it so the
    // canonical lookup hits the underlying provider's entry.
    const slashIdx = modelId.indexOf("/");
    if (slashIdx !== -1)
        return modelId.slice(slashIdx + 1);
    return modelId;
}
function lookupModelPrice(modelId) {
    if (!modelId)
        return undefined;
    const canonical = normalise(modelId);
    if (exports.MODEL_PRICES[canonical])
        return exports.MODEL_PRICES[canonical];
    // Fallback: strip a trailing date suffix ("-20241022") or "-latest".
    const stripped = canonical.replace(/-\d{8}$/, "").replace(/-latest$/, "");
    return exports.MODEL_PRICES[stripped];
}
function computeCost(modelId, inputTokens, outputTokens) {
    const price = lookupModelPrice(modelId);
    if (!price)
        return undefined;
    if (typeof inputTokens !== "number" && typeof outputTokens !== "number")
        return undefined;
    const inputUsd = ((inputTokens ?? 0) / 1_000_000) * price.input;
    const outputUsd = ((outputTokens ?? 0) / 1_000_000) * price.output;
    return {
        inputUsd,
        outputUsd,
        totalUsd: inputUsd + outputUsd,
    };
}
