"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { list } = incoming;
        if (!Array.isArray(list))
            return { filtered: [], discarded: [] };
        // `condition` is item-scoped: evaluated once per element with $item bound to that element.
        const keep = this.evalItemField("condition", list, { coerceTo: "boolean" });
        const filtered = [];
        const discarded = [];
        list.forEach((item, i) => (keep[i] ? filtered : discarded).push(item));
        return { filtered, discarded };
    }
}
exports.Node = Node;
