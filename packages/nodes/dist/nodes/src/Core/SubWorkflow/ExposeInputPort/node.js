"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    injectedData = null;
    async onRun(incoming) {
        // null = "exposed but nothing injected" — a settled-empty value the data
        // gate treats as arrived. Never emit undefined (that means "still waiting").
        return {
            output: this.injectedData ?? null,
        };
    }
}
exports.Node = Node;
