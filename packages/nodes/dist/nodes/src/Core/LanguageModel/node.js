"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const blueprint_1 = require("./blueprint");
const node_sdk_1 = require("../../../../node-sdk/src/index.js");
const node_sdk_2 = require("../../../../node-sdk/src/index.js");
const pricing_1 = require("./pricing");
class Node extends node_sdk_1.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    ttftMs;
    async onRun(incoming) {
        this.ttftMs = undefined;
        const runStartedAt = performance.now();
        const isAnthropic = this.getProviderName(incoming.languageModel) === "anthropic";
        const languageModel = incoming.tools?.length && incoming.languageModel.bindTools
            ? incoming.languageModel.bindTools(incoming.tools)
            : incoming.languageModel;
        const systemMessage = new node_sdk_2.LC.SystemMessage({
            content: this.fieldValues.systemMessage ?? "",
        });
        const messages = [systemMessage, ...incoming.messages].filter((m) => m != null);
        // Anthropic prefix caching: cache_control on the last content block, cloned so we never
        if (isAnthropic && messages.length) {
            if (messages[0] instanceof node_sdk_2.LC.SystemMessage)
                messages[0] = cacheLastBlock(messages[0]);
            messages[messages.length - 1] = cacheLastBlock(messages[messages.length - 1]);
        }
        const stream = await languageModel.stream(messages, {
            signal: this.context.abortAPI.signal,
        });
        let accumulated;
        for await (const chunk of stream) {
            if (this.ttftMs === undefined)
                this.ttftMs = performance.now() - runStartedAt;
            accumulated = accumulated === undefined ? chunk : accumulated.concat(chunk);
        }
        return { response: accumulated };
    }
    onRecordMetrics(args) {
        const { inputs, outputs } = args;
        const metrics = {};
        let inputTokenCount;
        let outputTokenCount;
        const response = outputs.response;
        const usage = (response?.usage_metadata
            ?? response?.response_metadata?.usage
            ?? response?.response_metadata?.tokenUsage);
        if (usage) {
            const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokens;
            const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? usage.completionTokens;
            const totalTokens = usage.total_tokens ?? usage.totalTokens
                ?? ((inputTokens ?? 0) + (outputTokens ?? 0));
            if (typeof inputTokens === "number") {
                metrics.inputTokens = { displayName: "Input tokens", value: inputTokens, type: "tokens" };
                inputTokenCount = inputTokens;
            }
            if (typeof outputTokens === "number") {
                metrics.outputTokens = { displayName: "Output tokens", value: outputTokens, type: "tokens" };
                outputTokenCount = outputTokens;
            }
            if (typeof totalTokens === "number")
                metrics.totalTokens = { displayName: "Total tokens", value: totalTokens, type: "tokens" };
        }
        if (this.ttftMs !== undefined)
            metrics.timeToFirstToken = {
                displayName: "Time to first token",
                value: Math.round(this.ttftMs),
                type: "duration_ms",
            };
        const lm = inputs.languageModel;
        const model = lm?.model
            ?? lm?.modelName
            ?? lm?.lc_kwargs?.model
            ?? lm?.lc_kwargs?.modelName
            ?? response?.response_metadata?.model_name
            ?? response?.response_metadata?.model;
        if (typeof model === "string")
            metrics.model = { displayName: "Model", value: model, type: "string" };
        const cost = (0, pricing_1.computeCost)(typeof model === "string" ? model : undefined, inputTokenCount, outputTokenCount);
        if (cost) {
            metrics.inputCost = { displayName: "Input cost", value: cost.inputUsd, type: "currency_usd" };
            metrics.outputCost = { displayName: "Output cost", value: cost.outputUsd, type: "currency_usd" };
            metrics.totalCost = { displayName: "Total cost", value: cost.totalUsd, type: "currency_usd" };
        }
        return metrics;
    }
    getProviderName(model) {
        return model._llmType?.(); // ensure model is initialized
    }
}
exports.Node = Node;
// Anthropic prefix caching: cache_control on the last content block, cloned so we never
// mutate shared history. System anchor covers tools+system; tail anchor is cumulative.
function cacheLastBlock(msg) {
    let blocks = [];
    if (typeof msg.content === "string") {
        if (msg.content)
            blocks = [{ type: "text", text: msg.content }];
        else
            blocks = [];
    }
    else {
        blocks = msg.content.map(b => typeof b === "string" ? { type: "text", text: b } : { ...b });
    }
    if (!blocks.length)
        return msg;
    blocks[blocks.length - 1] = {
        ...blocks[blocks.length - 1],
        cache_control: { type: "ephemeral" }
    };
    return Object.assign(Object.create(Object.getPrototypeOf(msg)), msg, { content: blocks });
}
