import { Validation, type Foundations, type Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { edgeReducers } from "./edge";

export const inputReducers = {
    setValue: (s, nodeId, inputId, value) => {
        s.isDirty = true;
        s.data.staticValues[nodeId] ??= {}
        s.data.staticValues[nodeId][inputId] = value
    },
    remove: (s, nodeId, inputId) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        const staticValues = s.data.staticValues[nodeId];

        const edgeId = s.cache.inputHandlesMap[nodeId][inputId];
        if (edgeId)
            edgeReducers.remove(s, edgeId);

        const inputIndex = node.inputs.findIndex(i => i.id === inputId);
        if (inputIndex !== -1) {
            node.inputs.splice(inputIndex, 1);
        }
        delete staticValues[inputId];
    },
    disconnectIfConnected: (s, nodeId, inputId) => {
        s.isDirty = true;
        const edgeId = s.cache.inputHandlesMap[nodeId][inputId]

        if (edgeId) {
            edgeReducers.remove(s, edgeId)
            return true;
        }
        return false;
    },
    validate: (s, nodeId, input) => {
        const issue = Validation.Issue.Input.check(input, nodeId, s.data, s.cache);

        if (issue){
            s.issues.nodes[nodeId] ??= { fields: {}, inputs: {} };
            s.issues.nodes[nodeId].inputs[input.id] = issue;
            return true;
        }
        delete s.issues.nodes[nodeId]?.inputs[input.id];

        return false;
    },
    add: (s, nodeId, input) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;

        node.inputs.push(input);
    }
} satisfies InputReducers


type InputReducers = {
    setValue: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        inputId: Foundations.Port.Input.Id,
        value: any
    ) => void
    disconnectIfConnected: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        inputId: Foundations.Port.Input.Id
    ) => boolean
    remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => void
    validate: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        input: Foundations.Port.Input
    ) => boolean
    add: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        input: Foundations.Port.Input
     ) => void
}