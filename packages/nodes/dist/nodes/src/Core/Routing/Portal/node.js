"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const blueprint_1 = require("./blueprint");
class Node extends node_sdk_1.RuntimeNode {
    injectedData = undefined;
    async onRun(incoming) {
        const fields = this.fieldValues;
        if (fields.direction === "in") {
            const resolvedIncoming = this.incomingFor(fields, incoming);
            const outNodes = this.context
                .workflowQueryAPI
                .getNodesByBlueprint(blueprint_1.Blueprint.id)
                .filter(({ fields: candidateFields, node }) => (candidateFields["portalId"] === fields.portalId) && (candidateFields["direction"] === "out") && (node.id !== this.nodeId));
            for (const { node } of outNodes) {
                const instance = this.context.instanceRegistryAPI.get(node.id);
                if (!(instance instanceof Node))
                    continue;
                instance.injectedData = resolvedIncoming.input;
                this.context.schedulerAPI.fireNode(node.id);
            }
            return {};
        }
        return {
            output: this.injectedData,
        };
    }
}
exports.Node = Node;
