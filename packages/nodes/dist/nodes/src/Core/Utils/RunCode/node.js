"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const domain_1 = require("../../../../../shared/domain");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { code } = this.fieldValues;
        try {
            const result = await this.context.airlockAPI.executeAsyncCode(domain_1.Airlock.Source.asCode(code), this.nodeId, incoming);
            return { output: result };
        }
        catch (err) {
            // OOM disposed the shared isolate — must terminate, never swallow.
            if (err instanceof Error && err.name === domain_1.Airlock.TERMINATION_ERROR_NAME)
                throw err;
            return { output: { error: err instanceof Error ? err.message : String(err) } };
        }
    }
}
exports.Node = Node;
