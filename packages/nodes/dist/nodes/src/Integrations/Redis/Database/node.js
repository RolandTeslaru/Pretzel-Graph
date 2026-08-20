"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(_incoming) {
        const fields = this.fieldValues;
        const creds = (0, node_sdk_1.toRedisCreds)(this.context.credentialsAPI.getDecryptedValue(this.credentials.redis.blob));
        const client = await node_sdk_1.redis.get(creds);
        switch (fields.resource) {
            case "string": {
                switch (fields.stringOperation) {
                    case "GET":
                        return {
                            result: await client.get(fields.key),
                        };
                    case "SET": {
                        const result = fields.stringTtl > 0
                            ? await client.set(fields.key, fields.stringValue, "EX", fields.stringTtl)
                            : await client.set(fields.key, fields.stringValue);
                        return {
                            result,
                        };
                    }
                    case "INCREMENT":
                        return {
                            result: await client.incrby(fields.key, fields.incrementAmount),
                        };
                    case "DECREMENT":
                        return {
                            result: await client.decrby(fields.key, fields.decrementAmount),
                        };
                }
            }
            case "key": {
                switch (fields.keyOperation) {
                    case "EXISTS":
                        return {
                            result: await client.exists(fields.key),
                        };
                    case "DELETE":
                        return {
                            result: await client.del(fields.key),
                        };
                    case "EXPIRE":
                        return {
                            result: await client.expire(fields.key, fields.expirySeconds),
                        };
                    case "TTL":
                        return {
                            result: await client.ttl(fields.key),
                        };
                }
            }
            case "hash": {
                switch (fields.hashOperation) {
                    case "HGET":
                        return {
                            result: await client.hget(fields.key, fields.hashGetField),
                        };
                    case "HSET":
                        return {
                            result: await client.hset(fields.key, fields.hashSetField, fields.hashSetValue),
                        };
                    case "HGETALL":
                        return {
                            result: await client.hgetall(fields.key),
                        };
                    case "HDELETE":
                        return {
                            result: await client.hdel(fields.key, fields.hashDeleteField),
                        };
                }
            }
        }
    }
}
exports.Node = Node;
