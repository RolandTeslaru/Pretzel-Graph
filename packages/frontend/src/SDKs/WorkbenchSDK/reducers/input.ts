import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { edgeReducers } from "./edge";
import type { InputContainer } from "../utils";

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
    changeOrder: (s, nodeId, active, over) => {
        s.isDirty = true;
        const node = s.workflow.data.nodes[nodeId];
        if (!node) return;

        const from = active.containerId;
        const to = over.containerId;

        const activeId = active.id;
        const overId = over?.id ?? null;

        const inputs = node.inputs;

        // Find the active input
        const activeIndex = inputs.findIndex(i => i.id === activeId);
        if (activeIndex === -1) return;

        const activeInput = inputs[activeIndex];

        // Same category reorder
        if (from === to) {
            if (!overId) return;
            const overIndex = inputs.findIndex(i => i.id === overId);
            if (overIndex === -1) return;

            // Remove and reinsert at new position
            inputs.splice(activeIndex, 1);
            inputs.splice(overIndex > activeIndex ? overIndex : overIndex, 0, activeInput);
            return;
        }

        // // Cross-category moves: normal <-> advanced
        // if ((from === "normal" && to === "advanced") || (from === "advanced" && to === "normal")) {
        //     // Update the advanced property
        //     activeInput.advanced = to === "advanced";

        //     // If overId exists, reposition relative to it
        //     if (overId) {
        //         const overIndex = inputs.findIndex(i => i.id === overId);
        //         if (overIndex !== -1 && overIndex !== activeIndex) {
        //             inputs.splice(activeIndex, 1);
        //             inputs.splice(overIndex > activeIndex ? overIndex : overIndex, 0, activeInput);
        //         }
        //     }
        //     return;
        // }

        // Connected category - just reorder within input array (connected is a virtual category)
        if (from === "connected" && to === "connected") {
            if (!overId) return;
            const overIndex = inputs.findIndex(i => i.id === overId);
            if (overIndex === -1) return;

            inputs.splice(activeIndex, 1);
            inputs.splice(overIndex > activeIndex ? overIndex : overIndex, 0, activeInput);
            return;
        }

        // Don't allow moves into/out of connected category
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
    changeOrder: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        active: {
            id: Foundations.Port.Input.Id,
            items: Foundations.Port.Input.Id[], // holds the current items where id is from
            containerId: InputContainer      // holds the current container id where the id is from
        },
        over: {
            id: Foundations.Port.Input.Id,
            items: Foundations.Port.Input.Id[],
            containerId: InputContainer
        }
    ) => void,
    remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => void
}