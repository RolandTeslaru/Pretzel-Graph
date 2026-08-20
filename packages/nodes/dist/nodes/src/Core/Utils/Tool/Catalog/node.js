"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const blueprint_1 = require("./blueprint");
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    async onRun(incoming) {
        const toolList = [];
        Object.entries(incoming).filter(([_, value]) => !!value).forEach(([key, value]) => {
            toolList.push(...value);
        });
        return {
            tool_list: toolList,
        };
    }
}
exports.Node = Node;
