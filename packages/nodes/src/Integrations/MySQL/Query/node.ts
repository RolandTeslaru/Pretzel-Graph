import { RegisterNode, RuntimeNode, InferInputs, InferOutputs, mysql, toMySqlCreds } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    // NOTE: schema / table ResourceLoader loaders are parked until the select / insert / …
    // operations are added — see SPECS/postgres-node.md. They read a `schema` field that only
    // exists once reconcile adds it for those operations.

    protected override async onRun(
        _inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const creds = toMySqlCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.mysql.blob));
        const sql = this.fields.query;
        const [rows] = await mysql.withConnection(creds, c => c.query(sql));
        return { rows: rows as unknown[] };
    }
}
