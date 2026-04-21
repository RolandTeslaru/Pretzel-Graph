import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";

type AnyRecord = Record<string, unknown>;

function toRecord(value: unknown): AnyRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as AnyRecord
        : {};
}

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const metadata = toRecord(context.session.metadata);
        const webhookPayload = toRecord(metadata.webhookPayload);

        const configuredMethod = String(this.fields.method ?? "POST").toUpperCase();
        const incomingMethod = typeof webhookPayload.method === "string"
            ? webhookPayload.method.toUpperCase()
            : undefined;

        if (incomingMethod && configuredMethod !== incomingMethod) {
            throw new Error(`Webhook method mismatch: expected ${configuredMethod}, got ${incomingMethod}`);
        }

        return {
            body: Object.prototype.hasOwnProperty.call(webhookPayload, "body") ? webhookPayload.body : null,
            headers: toRecord(webhookPayload.headers),
            query: toRecord(webhookPayload.query),
            params: toRecord(webhookPayload.params),
        };
    }

    protected override onWebhook(): Promise<void> | void {
        
    }
}