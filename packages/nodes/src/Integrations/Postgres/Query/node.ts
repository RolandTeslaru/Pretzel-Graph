import { RuntimeNode, InferIncoming, InferOutputs, toPgCreds } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const creds = toPgCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.postgres.blob));
        const sql = this.fieldValues.query;
        const result = await this.context.connectionAPI.postgres.withConnection(creds, c => c.query(sql));
        return { rows: result.rows };
    }
}
