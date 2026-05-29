import { RegisterNode, RuntimeNode, InferInputs, InferOutputs, mongo, toMongoCreds } from "@pretzel-graph/node-sdk";
import { ObjectId } from "mongodb";
import { Blueprint } from "./blueprint";

/** Convert a filter's string `_id` to an ObjectId so it matches stored documents. */
function withObjectId(filter: Record<string, unknown>): Record<string, unknown> {
    if (filter && typeof filter._id === "string") {
        return { ...filter, _id: new ObjectId(filter._id) };
    }
    return filter ?? {};
}

/** Deep-normalize BSON (ObjectId / Date instances) to plain JSON for the output port + transport. */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        _inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const creds = toMongoCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.mongoDb.blob));
        const client = await mongo.get(creds);
        const coll = client.db(creds.database).collection(this.fields.collection);

        // query / limit / update / documents are reconcile-added — not in InferFields — so cast.
        const f = this.fields as Record<string, unknown>;
        const operation = this.fields.operation;

        switch (operation) {
            case "find": {
                const query = withObjectId((f.query as Record<string, unknown>) ?? {});
                const limit = Number(f.limit ?? 50);
                const docs = await coll.find(query as never).limit(limit).toArray();
                return { result: plain(docs) };
            }
            // insert/update/delete reconcile the output to a single Data port, so the result is
            // a summary object — not reflected in InferOutputs (DataList), hence the cast.
            case "insert": {
                const documents = (f.documents as Record<string, unknown>[]) ?? [];
                const res = await coll.insertMany(documents as never);
                return { result: { insertedCount: res.insertedCount, insertedIds: plain(res.insertedIds) } } as unknown as InferOutputs<typeof Blueprint>;
            }
            case "update": {
                const query = withObjectId((f.query as Record<string, unknown>) ?? {});
                const update = (f.update as Record<string, unknown>) ?? {};
                const res = await coll.updateMany(query as never, { $set: update });
                return { result: { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount } } as unknown as InferOutputs<typeof Blueprint>;
            }
            case "delete": {
                const query = withObjectId((f.query as Record<string, unknown>) ?? {});
                const res = await coll.deleteMany(query as never);
                return { result: { deletedCount: res.deletedCount } } as unknown as InferOutputs<typeof Blueprint>;
            }
            default:
                return { result: [] };
        }
    }
}
