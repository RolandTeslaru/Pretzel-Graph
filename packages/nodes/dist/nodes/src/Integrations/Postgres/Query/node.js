"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(_incoming) {
        const creds = (0, node_sdk_1.toPgCreds)(this.context.credentialsAPI.getDecryptedValue(this.credentials.postgres.blob));
        const sql = this.fieldValues.query;
        const result = await node_sdk_1.postgres.withConnection(creds, c => c.query(sql));
        return { rows: result.rows };
    }
}
exports.Node = Node;
