import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";
import { tavily, type TavilyClient, type TavilyResearchOptions } from "@tavily/core";

import { Blueprint } from "./blueprint";
import { buildTool, runResearchTask } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    readonly #tavily: TavilyClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.Context) {
        super(nodeId, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);

        this.#tavily = tavily({ apiKey });
    }


    private getResearchOptions(): TavilyResearchOptions {
        const fields = this.fieldValues;

        return {
            model: fields.model,

            ...(fields.includeDomains.length > 0
                ? { include_domains: fields.includeDomains }
                : {}),

            ...(fields.excludeDomains.length > 0
                ? { exclude_domains: fields.excludeDomains }
                : {}),
        };
    }


    private readonly waitForMilliseconds = (milliseconds: number): Promise<void> =>
        this.AbortablePromise<void>((resolve, _reject, signal) => {
            const timer = setTimeout(resolve, milliseconds);

            signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
        });


    protected override async onRun() {
        const fields = this.fieldValues;

        if (fields.isConvertedToTool === true)
            return {
                tool: buildTool(this.#tavily, this.getResearchOptions(), this.waitForMilliseconds),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        if (fields.outputFormat === "structured") {
            const outputSchema = fields.outputSchema;

            if (outputSchema === null || typeof outputSchema !== "object" || Array.isArray(outputSchema))
                throw new Error("Tavily Research: 'Output Schema' must be a JSON Schema object.");

            const task = await runResearchTask(this.#tavily, fields.input, {
                ...this.getResearchOptions(),
                outputSchema: outputSchema as Record<string, unknown>,
            }, this.waitForMilliseconds);

            return {
                result:  task.content,
                sources: task.sources,
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        const task = await runResearchTask(this.#tavily, fields.input, {
            ...this.getResearchOptions(),
            citationFormat: fields.citationFormat,
            output_length:  fields.outputLength,
        }, this.waitForMilliseconds);

        const report = typeof task.content === "string"
            ? task.content
            : JSON.stringify(task.content);

        return {
            report,
            sources: task.sources,
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
