import { RuntimeNode, InferIncoming, InferOutputs, toMySqlCreds } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const creds = toMySqlCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.mysql.blob));
        const sql = this.fieldValues.query;
        const [rows] = await this.context.connectionAPI.mysql.withConnection(creds, c => c.query(sql));
        return { rows: rows as unknown[] };
    }
}
