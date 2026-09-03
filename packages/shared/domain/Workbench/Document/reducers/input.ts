import { Validation } from "../../../Validation";
import type { Foundations } from "../../../Foundations";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const inputReducers: InputReducers = {
    setValue: (d, nodeId, inputId, value) => {
        d.isDirty = true;
        d.reducers.node.ensureStaticValues(d, nodeId)[inputId] = value
    },
    remove: (d, nodeId, inputId) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        const staticValues = d.data.staticValues[nodeId];

        const edgeId = d.cache.inputEdgesByPort[nodeId][inputId];
        if (edgeId)
            d.reducers.edge.remove(d, edgeId);

        const inputIndex = node.addedInputs?.findIndex(i => i.id === inputId);
        if (inputIndex !== undefined && inputIndex !== -1) {
            node.addedInputs?.splice(inputIndex, 1);
        }
        delete staticValues[inputId];
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
    disconnectIfConnected: (d, nodeId, inputId) => {
        d.isDirty = true;
        const edgeId = d.cache.inputEdgesByPort[nodeId][inputId]

        if (edgeId) {
            d.reducers.edge.remove(d, edgeId)
            return true;
        }
        return false;
    },
    validate: (d, nodeId, input) => {
        const issue = Validation.Issue.Input.check(input, nodeId, d.data, d.cache);

        if (issue){
            d.issues.nodes[nodeId] ??= { fields: {}, inputs: {}, credentials: {} };
            d.issues.nodes[nodeId].inputs[input.id] = issue;
            return true;
        }
        delete d.issues.nodes[nodeId]?.inputs[input.id];

        return false;
    },
    add: (d, nodeId, input) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) return;

        node.addedInputs = node.addedInputs ?? [];

        node.addedInputs.push(input);
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    }
}


type InputReducers = {
    setValue: (
        document: Document,
        nodeId: Workflow.Node.Id,
        inputId: Foundations.Port.Input.Id,
        value: any
    ) => void
    disconnectIfConnected: (
        document: Document,
        nodeId: Workflow.Node.Id,
        inputId: Foundations.Port.Input.Id
    ) => boolean
    remove: (document: Document, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => void
    validate: (
        document: Document,
        nodeId: Workflow.Node.Id,
        input: Foundations.Port.Input
    ) => boolean
    add: (
        document: Document,
        nodeId: Workflow.Node.Id,
        input: Foundations.Port.Input
     ) => void
}
