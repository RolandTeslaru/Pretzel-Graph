import { Validation, type Foundations, type Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { edgeReducers } from "./edge";

export const inputReducers = {
    setValue: (s, nodeId, inputId, value) => {
        s.isDirty = true;
        s.workflow.data.staticValues[nodeId] ??= {}
        s.workflow.data.staticValues[nodeId][inputId] = value
    },
    remove: (s, nodeId, inputId) => {
        s.isDirty = true;
        const node = s.workflow.data.nodes[nodeId];
        const staticValues = s.workflow.data.staticValues[nodeId];

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
        const issue = Validation.Issue.Input.check(input, nodeId, s.workflow, s.cache);

        if (issue){
            s.issues[nodeId] ??= { fields: {}, inputs: {} };
            s.issues[nodeId].inputs[input.id] = issue;
            return true;
        }
        delete s.issues[nodeId]?.inputs[input.id];

        return false;
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
}