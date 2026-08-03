import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs, postgres, toPgCreds } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const creds = toPgCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.postgres.blob));
        const sql = this.fieldValues.query;
        const result = await postgres.withConnection(creds, c => c.query(sql));
        return { rows: result.rows };
    }
}
