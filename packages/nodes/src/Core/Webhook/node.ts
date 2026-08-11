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

    // Registering the route and announcing readiness both invite the payload, so they run
    // inside awaitSignalAfter — the waiter exists before either can be answered.
    //
    // This wait cannot currently be satisfied: the webhook server publishes its resolve
    // signal from reg.workflowId, and its registry holds no executionId to address a parked
    // node with. See SPECS/execution-signal-router.md, Out of Scope.
    private async waitForTestPayload(): Promise<Webhook.Payload> {
        const path   = this.fieldValues.path   as Webhook.Path;
        const method = this.fieldValues.method as Webhook.Method;


        const res = await this.context.consultationAPI.consult(
            Webhook.Test.Consultation.Request,
            {
                nodeId:    this.nodeId,
                variant:   Webhook.Test.Consultation.Variant,
                timeoutMs: this.fieldValues.testTimeoutMs,
                path,
                method
            },
            Webhook.Test.Consultation.Answer
        )

        return res.payload;
    }
}
