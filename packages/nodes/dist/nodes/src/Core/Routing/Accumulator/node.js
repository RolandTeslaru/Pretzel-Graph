"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { append, overwrite } = incoming;
        const previousState = this.context.session.node_output_instances[this.nodeId]?.state ?? [];
        const appendItems = Array.isArray(append) ? append.flat() : append != null ? [append] : [];
        let newState = [...previousState, ...appendItems];
        if (overwrite !== undefined) {
            if (Array.isArray(overwrite)) {
                newState = [...overwrite];
            }
            else {
                newState = overwrite != null ? [overwrite] : [];
            }
        }
        return {
            state: newState,
            prevState: previousState,
        };
    }
}
exports.Node = Node;
