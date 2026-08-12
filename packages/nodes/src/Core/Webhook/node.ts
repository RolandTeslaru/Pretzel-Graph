import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import Redis from "ioredis";
import z from "zod";

type AnyRecord = Record<string, unknown>;

const TEST_WAIT_MS = 120_000; // 2 minutes

function toRecord(value: unknown): AnyRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as AnyRecord
        : {};
}

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

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
            payload: {
                method: this.payload.method,
                path: this.payload.path,
                headers: toRecord(this.payload.headers),
                query: toRecord(this.payload.query),
                body: this.payload.body ?? null,
            },
        };
    }

    // Registering the route is what invites the payload, so it runs in `onOpen` — inside the
    // armed window, once the waiter exists and the card is on the session. The registration
    // carries the execution and consultation ids so the webhook server, which addresses routes
    // only by workflow and path, can hand the payload back to this exact parked node.
    private async waitForTestPayload(): Promise<Webhook.Payload> {
        const path   = this.fieldValues.path   as Webhook.Path;
        const method = this.fieldValues.method as Webhook.Method;

        const res = await this.context.consultationAPI.consult({
            requestSchema: Webhook.Test.Consultation.Request,
            answerSchema:  Webhook.Test.Consultation.Answer,
            request: {
                nodeId:    this.nodeId,
                variant:   Webhook.Test.Consultation.Variant,
                timeoutMs: this.fieldValues.testTimeoutMs,
                path,
                method
            },
            onOpen: request => Webhook.Test.API.register(this.context.internalAPI.raw, {
                workflowId:     this.context.workflowId,
                path,
                method,
                // Doubles as the route's TTL, so it expires exactly when this wait does.
                timeoutMs:      this.fieldValues.testTimeoutMs,
                executionId:    this.context.executionId,
                consultationId: request.id,
            }).then(() => {}),
        })

        return res.payload;
    }
}
