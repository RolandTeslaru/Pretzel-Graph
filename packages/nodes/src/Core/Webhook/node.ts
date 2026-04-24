import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

type AnyRecord = Record<string, unknown>;

function toRecord(value: unknown): AnyRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as AnyRecord
        : {};
}

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    private payload: AnyRecord | null = null;

    protected override async onWebhook(webhookPayload: AnyRecord) {
        this.payload = webhookPayload;
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        if (!this.payload) {
            throw new Error("Webhook node has no payload — was triggerWebhook called before run?");
        }

        return {
            body: this.payload.body ?? null,
            headers: toRecord(this.payload.headers),
            query: toRecord(this.payload.query),
            params: {},
        };
    }
}