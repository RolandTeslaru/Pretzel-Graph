"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    CATCHES_ERROR = true;
    // Normal (non-error) path only: return `passthrough`, so the default routing
    // signals that branch and never the `onError` branch.
    // The error path is engine-driven via `CATCHES_ERROR` (writes `onError`,
    // emits only that branch, swallows the envelope) and does not call onRun.
    async onRun(incoming) {
        return { passthrough: incoming.input };
    }
}
exports.Node = Node;
