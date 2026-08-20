"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { cases } = this.fieldValues;
        const { input } = incoming;
        const result = {};
        // cases are pre-evaluated by evaluateFieldValues() — value is always a plain boolean here.
        for (const { value, portId } of cases) {
            if (value)
                result[portId] = input;
        }
        return result;
    }
}
exports.Node = Node;
