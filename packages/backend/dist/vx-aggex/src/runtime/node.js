"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeNode = void 0;
class RuntimeNode {
    constructor(props) {
        this.workflowNode = props.workflowNode;
        this.fields = RuntimeNode.resolveFields(this.workflowNode.id, props.workflow);
        this.emit = props.emit;
    }
    init(props) { }
    async onConversion(currentBlueprint) {
        return currentBlueprint;
    }
    static resolveInitialFieldValues(blueprint, fields) {
        const resolved = {};
        for (const field of blueprint.fields) {
            resolved[field.id] = field.initialValue;
        }
        for (const [fieldId, fieldValue] of Object.entries(fields)) {
            resolved[fieldId] = fieldValue;
        }
        return resolved;
    }
    // Checks if a field has static values
    // And if not, it uses the initialValue
    static resolveFields(nodeId, workflow) {
        const node = workflow.data.nodes[nodeId];
        const staticValues = workflow.data.staticValues[nodeId] ?? {};
        const resolved = {};
        for (const field of node.fields) {
            const fieldId = field.id;
            if (fieldId in staticValues)
                resolved[fieldId] = staticValues[fieldId];
            else
                resolved[fieldId] = field.initialValue;
        }
        return resolved;
    }
}
exports.RuntimeNode = RuntimeNode;
