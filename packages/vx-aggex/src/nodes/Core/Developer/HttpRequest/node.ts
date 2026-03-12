import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { method, url, headers, body } = this.fields;

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
