"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const outputId = this.nodeId;
        if (!this.context.enclosingNodeAPI)
            throw new Error("No enclosing node API available. This node can only be used within a subworkflow.");
        this.context.enclosingNodeAPI.writePort(outputId, incoming.input);
        this.context.enclosingNodeAPI.emitPort(outputId);
        return {};
    }
}
exports.Node = Node;
