import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Webhook } from "@pretzel-graph/shared/domain/Foundations/Webhook";
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
        this.payload = webhookPayload as Webhook.Payload;
    }



    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        if (!this.payload) {
            this.payload = await this.waitForTestPayload();
        }

        return {
            body: this.payload.body ?? null,
            headers: toRecord(this.payload.headers),
            query: toRecord(this.payload.query),
            params: {},
        };
    }



    private async waitForTestPayload() {
        const { workflowId } = this.context;
        
        const path   = this.fields.path   as Webhook.Path;
        const method = this.fields.method as Webhook.Method;

        await Webhook.Test.API.register(AxiosService.api, { workflowId, path, method });

        return this.AbortablePromise<Webhook.Payload>((resolve, reject, signal) => {
            const channel = Webhook.Test.Signal.getChannel(workflowId);
            const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

            const cleanup = () => {
                clearTimeout(timer);
                redis.unsubscribe(channel).catch(() => {});
                redis.disconnect();
            };

            const timer = setTimeout(() => {
                cleanup();
                this.context.abortWorkflow('Webhook test timed out after 2 minutes');
                reject(new Error('Webhook test timed out'));
            }, TEST_WAIT_MS);

            signal.addEventListener('abort', cleanup, { once: true });

            redis.subscribe(channel, (err) => {
                if (err) { cleanup(); reject(err); }
            });

            redis.on('message', (_channel, raw) => {
                cleanup();
                try {
                    const sig = Webhook.Test.Signal.Schema.parse(JSON.parse(raw));
                    switch (sig.type) {
                        case "resolve": return resolve(sig.payload);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}
