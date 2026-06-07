import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFields, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { LC } from "@pretzel-graph/node-sdk";
import { Execution } from "@pretzel-graph/shared/domain";
import { computeCost } from "./pricing";

type Inputs = InferInputs<typeof Blueprint>
type Outputs = InferOutputs<typeof Blueprint>

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private ttftMs: number | undefined;

    protected override async onRun(
        inputs: Inputs
    ): Promise<Outputs> {

        this.ttftMs = undefined;
        const runStartedAt = performance.now();

        const { systemMessage } = inputs;

        const languageModel = inputs.tools?.length && inputs.languageModel.bindTools
            ? inputs.languageModel.bindTools(inputs.tools)
            : inputs.languageModel;

        const messages = [systemMessage, ...inputs.messages].filter((m): m is LC.BaseMessage => m != null);

        const stream = await languageModel.stream(messages, {
            signal: this.context.abortAPI.signal,
        });

        let accumulated: LC.AIMessageChunk | undefined;
        for await (const chunk of stream) {
            if (this.ttftMs === undefined)
                this.ttftMs = performance.now() - runStartedAt;
            accumulated = accumulated === undefined ? chunk : accumulated.concat(chunk);
        }

        return { response: accumulated as unknown as LC.AIMessage };
    }


    protected override onRecordMetrics(args: {
        inputs:   Inputs,
        outputs:  Partial<Outputs>,
        unitId:   Execution.Recording.UnitOfWork.Id,
        status:   Execution.Recording.UnitOfWork["status"],
        duration: number,
    }): Record<string, Execution.Recording.Metric> | undefined {
        const { inputs, outputs } = args;

        const metrics: Record<string, Execution.Recording.Metric> = {};

        let inputTokenCount:  number | undefined;
        let outputTokenCount: number | undefined;

        const response = outputs.response as LC.AIMessage;
        const usage = (response?.usage_metadata
            ?? response?.response_metadata?.usage
            ?? response?.response_metadata?.tokenUsage) as {
                input_tokens?:      number,
                output_tokens?:     number,
                total_tokens?:      number,
                prompt_tokens?:     number,
                completion_tokens?: number,
                promptTokens?:      number,
                completionTokens?:  number,
                totalTokens?:       number,
            } | undefined;

        if (usage) {
            const inputTokens  = usage.input_tokens  ?? usage.prompt_tokens     ?? usage.promptTokens;
            const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? usage.completionTokens;
            const totalTokens  = usage.total_tokens  ?? usage.totalTokens
                                ?? ((inputTokens ?? 0) + (outputTokens ?? 0));

            if (typeof inputTokens === "number") {
                metrics.inputTokens  = { displayName: "Input tokens",  value: inputTokens,  type: "tokens" };
                inputTokenCount = inputTokens;
            }
            if (typeof outputTokens === "number") {
                metrics.outputTokens = { displayName: "Output tokens", value: outputTokens, type: "tokens" };
                outputTokenCount = outputTokens;
            }
            if (typeof totalTokens === "number")
                metrics.totalTokens  = { displayName: "Total tokens",  value: totalTokens,  type: "tokens" };
        }

        if (this.ttftMs !== undefined)
            metrics.timeToFirstToken = {
                displayName: "Time to first token",
                value: Math.round(this.ttftMs),
                type: "duration_ms",
            };

        const lm = inputs.languageModel as any;
        const model = lm?.model
            ?? lm?.modelName
            ?? lm?.lc_kwargs?.model
            ?? lm?.lc_kwargs?.modelName
            ?? response?.response_metadata?.model_name
            ?? response?.response_metadata?.model;
        if (typeof model === "string")
            metrics.model = { displayName: "Model", value: model, type: "string" };

        const cost = computeCost(
            typeof model === "string" ? model : undefined,
            inputTokenCount,
            outputTokenCount,
        );
        if (cost) {
            metrics.inputCost  = { displayName: "Input cost",  value: cost.inputUsd,  type: "currency_usd" };
            metrics.outputCost = { displayName: "Output cost", value: cost.outputUsd, type: "currency_usd" };
            metrics.totalCost  = { displayName: "Total cost",  value: cost.totalUsd,  type: "currency_usd" };
        }

        return metrics;
    }
}
