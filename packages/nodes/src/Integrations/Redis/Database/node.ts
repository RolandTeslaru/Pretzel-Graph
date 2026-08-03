import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs, redis, toRedisCreds } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ) {
        const fields = this.fieldValues;
        const creds = toRedisCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.redis.blob));
        const client = await redis.get(creds);

        switch (fields.resource) {
            case "string": {
                switch (fields.stringOperation) {
                    case "GET":
                        return {
                            result: await client.get(fields.key),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "SET": {
                        const result = fields.stringTtl > 0
                            ? await client.set(fields.key, fields.stringValue, "EX", fields.stringTtl)
                            : await client.set(fields.key, fields.stringValue);
                        return {
                            result,
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                    }

                    case "INCREMENT":
                        return {
                            result: await client.incrby(fields.key, fields.incrementAmount),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "DECREMENT":
                        return {
                            result: await client.decrby(fields.key, fields.decrementAmount),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }
            }

            case "key": {
                switch (fields.keyOperation) {
                    case "EXISTS":
                        return {
                            result: await client.exists(fields.key),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "DELETE":
                        return {
                            result: await client.del(fields.key),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "EXPIRE":
                        return {
                            result: await client.expire(fields.key, fields.expirySeconds),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "TTL":
                        return {
                            result: await client.ttl(fields.key),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }
            }

            case "hash": {
                switch (fields.hashOperation) {
                    case "HGET":
                        return {
                            result: await client.hget(fields.key, fields.hashGetField),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "HSET":
                        return {
                            result: await client.hset(fields.key, fields.hashSetField, fields.hashSetValue),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "HGETALL":
                        return {
                            result: await client.hgetall(fields.key),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "HDELETE":
                        return {
                            result: await client.hdel(fields.key, fields.hashDeleteField),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }
            }
        }
    }
}
