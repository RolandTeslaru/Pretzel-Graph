"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { duration } = this.fieldValues;
        const { trigger } = incoming;
        await this.AbortablePromise((resolve, reject, signal) => {
            const timer = setTimeout(resolve, duration);
            signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
        });
        return {
            done: trigger
        };
    }
}
exports.Node = Node;
