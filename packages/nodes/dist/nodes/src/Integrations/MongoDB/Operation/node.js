"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const mongodb_1 = require("mongodb");
function isDocument(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function asDocument(value) {
    return isDocument(value) ? value : {};
}
function asDocuments(value) {
    return Array.isArray(value) ? value.filter(isDocument) : [];
}
/** Convert a filter's string `_id` to an ObjectId so it matches stored documents. */
function withObjectId(filter) {
    if (filter && typeof filter._id === "string") {
        return { ...filter, _id: new mongodb_1.ObjectId(filter._id) };
    }
    return filter ?? {};
}
/** Deep-normalize BSON (ObjectId / Date instances) to plain JSON for the output port + transport. */
const plain = (v) => JSON.parse(JSON.stringify(v));
class Node extends node_sdk_1.RuntimeNode {
    async onRun(_incoming) {
        const fields = this.fieldValues;
        const creds = (0, node_sdk_1.toMongoCreds)(this.context.credentialsAPI.getDecryptedValue(this.credentials.mongoDb.blob));
        const client = await node_sdk_1.mongo.get(creds);
        const coll = client.db(creds.database).collection(fields.collection);
        switch (fields.operation) {
            case "find": {
                const query = withObjectId(asDocument(fields.query));
                const docs = await coll.find(query).limit(fields.limit).toArray();
                return {
                    result: plain(docs),
                };
            }
            case "insert": {
                const documents = asDocuments(fields.documents);
                const res = await coll.insertMany(documents);
                return {
                    result: {
                        insertedCount: res.insertedCount,
                        insertedIds: plain(res.insertedIds),
                    },
                };
            }
            case "update": {
                const query = withObjectId(asDocument(fields.query));
                const update = asDocument(fields.update);
                const res = await coll.updateMany(query, { $set: update });
                return {
                    result: {
                        matchedCount: res.matchedCount,
                        modifiedCount: res.modifiedCount,
                    },
                };
            }
            case "delete": {
                const query = withObjectId(asDocument(fields.query));
                const res = await coll.deleteMany(query);
                return {
                    result: {
                        deletedCount: res.deletedCount,
                    },
                };
            }
        }
    }
}
exports.Node = Node;
