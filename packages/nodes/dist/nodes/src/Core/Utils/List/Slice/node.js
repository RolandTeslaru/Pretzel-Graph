"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { start, end } = this.fieldValues;
        const { list } = incoming;
        if (!Array.isArray(list)) {
            return { slice: [] };
        }
        const result = end === undefined ? list.slice(start) : list.slice(start, end);
        return { slice: result };
    }
}
exports.Node = Node;
