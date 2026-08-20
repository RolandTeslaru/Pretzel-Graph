"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(_incoming) {
        const fields = this.fieldValues;
        if (fields.mode === "error")
            throw new Error(fields.message.trim() || "Workflow terminated.");
        // stop → end the whole run cleanly (engine resolves with status "terminated").
        this.context.abortAPI.abort("Workflow terminated by Terminate node.");
        return {};
    }
}
exports.Node = Node;
