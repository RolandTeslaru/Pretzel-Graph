"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const output = Object.values(incoming).map(value => value ?? []).flat(this.fieldValues.flattenDepth);
        return { output };
    }
}
exports.Node = Node;
