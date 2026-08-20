"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../node-sdk/src/index.js");
const Webhook_1 = require("../../../../shared/domain/Webhook");
const TEST_WAIT_MS = 120_000; // 2 minutes
function toRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
class Node extends node_sdk_1.RuntimeNode {
    payload = null;
    async onWebhook(webhookPayload) {
        console.log(`[WebhookNode] Payload injected via igniter — method=${webhookPayload.method} path=${webhookPayload.path}`);
        this.payload = webhookPayload;
    }
    async onRun() {
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
    async waitForTestPayload() {
        const path = this.fieldValues.path;
        const method = this.fieldValues.method;
        const res = await this.context.consultationAPI.consult({
            requestSchema: Webhook_1.Webhook.Test.Consultation.Request,
            answerSchema: Webhook_1.Webhook.Test.Consultation.Answer,
            request: {
                nodeId: this.nodeId,
                variant: Webhook_1.Webhook.Test.Consultation.Variant,
                timeoutMs: this.fieldValues.testTimeoutMs,
                path,
                method
            },
            onOpen: request => Webhook_1.Webhook.Test.API.register(this.context.internalAPI.raw, {
                workflowId: this.context.workflowId,
                path,
                method,
                // Doubles as the route's TTL, so it expires exactly when this wait does.
                timeoutMs: this.fieldValues.testTimeoutMs,
                executionId: this.context.executionId,
                consultationId: request.id,
            }).then(() => { }),
        });
        return res.payload;
    }
}
exports.Node = Node;
