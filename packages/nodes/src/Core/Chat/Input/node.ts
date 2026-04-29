import { RegisterNode } from "@pretzel-graph/node-sdk"
import { Blueprint } from "./blueprint"
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { HumanMessage } from "@langchain/core/messages";
import { Webhook } from "@pretzel-graph/shared/domain";
import { api } from "../../../services/AxiosService";
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import Redis from "ioredis";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static WEBHOOK_PATH = "chat" as Webhook.Path;
    public static WEBHOOK_TIMEOUT = 120_000; // 2 minutes

    public readonly Blueprint = Blueprint;

    private message: HumanMessage | null = null;

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {

        if(!this.message)
            this.message = await this.waitForMessage();


        return { response: this.message };
    }


    private async waitForMessage(){
        const { workflowId } = this.context;


        await Webhook.Test.API.register(api, { workflowId, path: Node.WEBHOOK_PATH, method: "POST" });

        this.CreateSignalPromise()

        return this.AbortablePromise<Webhook.Payload>((resolve, reject, abortSignal) => {
            const channel = Webhook.Test.Signal.getChannel(workflowId);
            const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

            const cleanup = () => {
                clearTimeout(timer);
                redis.unsubscribe(channel).catch(() => {});
                redis.disconnect();
            };

            const timer = setTimeout(() => {
                cleanup();
                this.context.abortExecution('Webhook test timed out after 2 minutes');
                reject(new Error('Webhook test timed out'));
            }, Node.WEBHOOK_TIMEOUT);

            abortSignal.addEventListener('abort', cleanup, { once: true });

            redis.subscribe(channel, (err) => {
                if (err) { cleanup(); reject(err); }
            });

            redis.on('message', (_channel, raw) => {
                cleanup();
                try {
                    const sig = Webhook.Test.Signal.Schema.parse(JSON.parse(raw));
                    return resolve(sig.payload);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}