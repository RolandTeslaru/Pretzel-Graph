"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { strategy, index } = this.fieldValues;
        const { list } = incoming;
        if (!Array.isArray(list) || list.length === 0) {
            return { element: undefined };
        }
        let picked;
        switch (strategy) {
            case "first":
                picked = list[0];
                break;
            case "last":
                picked = list[list.length - 1];
                break;
            case "at_index": {
                const i = index < 0 ? list.length + index : index;
                picked = list[i];
                break;
            }
        }
        return { element: picked };
    }
}
exports.Node = Node;
