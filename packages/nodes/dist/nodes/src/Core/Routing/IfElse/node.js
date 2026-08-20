"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        // condition is pre-evaluated by evaluateFieldValues() — a plain boolean here.
        // Legacy nodes that still hold a condition-tree object coerce to the default (true).
        const result = !!this.fieldValues.condition;
        return result
            ? { true: incoming.input }
            : { false: incoming.input };
    }
}
exports.Node = Node;
