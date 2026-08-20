"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { error } = this.fieldValues;
        throw new Error(error || "Intentional error");
    }
}
exports.Node = Node;
