"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const result = {};
        for (const [key, value] of Object.entries(incoming)) {
            const index = key.replace("input_", "");
            // never emit undefined (means "still waiting"), but allow null (means "exposed but nothing injected")
            result[`output_${index}`] = value ?? null;
        }
        return result;
    }
}
exports.Node = Node;
