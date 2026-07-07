import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { method, url, headers, body } = this.fieldValues;

        const requestOptions: RequestInit = {
            method: method,
            headers: new Headers(headers as Record<string, string>),
        };

        if (method !== 'GET' && method !== "HEAD" as any) {
            requestOptions.body = JSON.stringify(body);
            // Ensure Content-Type is set if body is present and not overridden
            if (!(requestOptions.headers as Headers).has('Content-Type')) {
                (requestOptions.headers as Headers).set('Content-Type', 'application/json');
            }
        }

        try {
            const response = await fetch(url, requestOptions);
            const responseData = await response.json().catch(() => ({}));

            return {
                response: responseData,
                status: response.status
            };

        } catch (error) {
            return {
                response: { error: error instanceof Error ? error.message : String(error) },
                status: 500
            };
        }
    }

}
