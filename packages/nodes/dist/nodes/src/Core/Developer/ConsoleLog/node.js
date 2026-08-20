"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { level, prefix } = this.fieldValues;
        const { message } = incoming;
        const logMethod = console[level] || console.log;
        if (prefix) {
            logMethod(`[${prefix}]`, message);
        }
        else {
            logMethod(message);
        }
        return {
            output: message
        };
    }
}
exports.Node = Node;
