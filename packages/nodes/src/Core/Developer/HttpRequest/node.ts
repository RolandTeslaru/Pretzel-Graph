import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { buildTools, executeHttpRequest } from "./tools";

export class Node extends RuntimeNode<typeof Blueprint> {

    private readonly client = this.httpClientFactory.create({
        vendor:         "HTTP Request",
        validateStatus: () => true,
    });

    protected override async onRun() {
        const fields = this.fieldValues;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(this.client),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        return {
            result: await executeHttpRequest(this.client, {
                method:  fields.method,
                url:     fields.url,
                headers: fields.headers as Record<string, string>,
                body:    fields.body,
            }),
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
