import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import { AxiosService } from "../../services/AxiosService";
import Redis from "ioredis";

type AnyRecord = Record<string, unknown>;

const TEST_WAIT_MS = 120_000; // 2 minutes

function toRecord(value: unknown): AnyRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as AnyRecord
        : {};
}

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    private payload: Webhook.Payload | null = null;

    
    
    protected override async onWebhook(webhookPayload: AnyRecord) {
        console.log(`[WebhookNode] Payload injected via igniter — method=${(webhookPayload as Webhook.Payload).method} path=${(webhookPayload as Webhook.Payload).path}`);
        this.payload = webhookPayload as Webhook.Payload;
    }

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {
        if (!this.payload) {
            console.log(`[WebhookNode] No payload — entering test mode`);
            this.payload = await this.waitForTestPayload();
        }

        console.log(`[WebhookNode] Resolving with method=${this.payload.method} path=${this.payload.path}`);
        return {
            body: this.payload.body ?? null,
            headers: toRecord(this.payload.headers),
            query: toRecord(this.payload.query),
            params: {},
        };
    }

    private async waitForTestPayload(): Promise<Webhook.Payload> {
        const { workflowId } = this.context;

        const path   = this.fields.path   as Webhook.Path;
        const method = this.fields.method as Webhook.Method;

        console.log(`[WebhookNode] Registering test webhook [${method}] /${workflowId}/${path}`);
        await Webhook.Test.API.register(AxiosService.api, { workflowId, path, method });
        console.log(`[WebhookNode] Waiting for test payload on channel=${Webhook.Test.ResolveSignal.getChannel(this.context.executionId)}`);

        const signal = await this.CreateSignalPromise(
            Webhook.Test.ResolveSignal.getChannel(this.context.executionId),
            Webhook.Test.ResolveSignal.Schema,
            TEST_WAIT_MS
        );

        console.log(`[WebhookNode] Received test payload`);
        return signal.payload;
    }
}
