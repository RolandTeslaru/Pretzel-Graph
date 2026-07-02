import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs, redis, toRedisCreds } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const creds = toRedisCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.redis.blob));
        const client = await redis.get(creds);

        const operation = this.fieldValues.operation;
        const key = this.fieldValues.key;

        switch (operation) {
            case "GET":
                return { result: await client.get(key) };

            case "SET": {
                // value / ttl are reconcile-added, so not in InferFieldValues — read via cast.
                const f = this.fieldValues as Record<string, unknown>;
                const value = String(f.value ?? "");
                const ttl = Number(f.ttl ?? 0);
                const result = ttl > 0
                    ? await client.set(key, value, "EX", ttl)
                    : await client.set(key, value);
                return { result };
            }

            case "DELETE":
                return { result: await client.del(key) };

            default:
                return { result: null };
        }
    }
}
