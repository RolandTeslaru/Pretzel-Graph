import { RuntimeNode, InferIncoming, InferOutputs, mongo, toMongoCreds } from "@pretzel-graph/node-sdk";
import { ObjectId, type Document, type Filter } from "mongodb";
import { Blueprint } from "./blueprint";

function isDocument(value: unknown): value is Document {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asDocument(value: unknown): Document {
    return isDocument(value) ? value : {};
}

function asDocuments(value: unknown): Document[] {
    return Array.isArray(value) ? value.filter(isDocument) : [];
}

/** Convert a filter's string `_id` to an ObjectId so it matches stored documents. */
function withObjectId(filter: Document): Filter<Document> {
    if (filter && typeof filter._id === "string") {
        return { ...filter, _id: new ObjectId(filter._id) };
    }
    return filter ?? {};
}

/** Deep-normalize BSON (ObjectId / Date instances) to plain JSON for the output port + transport. */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ) {
        const fields = this.fieldValues;
        const creds = toMongoCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.mongoDb.blob));
        const client = await mongo.get(creds);
        const coll = client.db(creds.database).collection(fields.collection);

        switch (fields.operation) {
            case "find": {
                const query = withObjectId(asDocument(fields.query));
                const docs = await coll.find(query).limit(fields.limit).toArray();
                return {
                    result: plain(docs),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "insert": {
                const documents = asDocuments(fields.documents);
                const res = await coll.insertMany(documents);
                return {
                    result: {
                        insertedCount: res.insertedCount,
                        insertedIds: plain(res.insertedIds),
                    },
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
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
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "delete": {
                const query = withObjectId(asDocument(fields.query));
                const res = await coll.deleteMany(query);
                return {
                    result: {
                        deletedCount: res.deletedCount,
                    },
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }
        }
    }
}
