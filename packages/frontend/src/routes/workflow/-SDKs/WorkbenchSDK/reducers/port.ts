import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { edgeReducers } from "./edge";

export const portReducers = {
    removeOutput: (s, nodeId, portId) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;

        const edgeId = s.cache.outputHandlesMap[nodeId]?.[portId];
        if (edgeId)
            edgeReducers.remove(s, edgeId);

        node.outputs = node.outputs.filter(p => p.id !== portId) as typeof node.outputs;
    },
    addOutput: (s, nodeId, port) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;

        node.outputs.push(port as typeof node.outputs[number]);
    },
    setOutputDisplayName: (s, nodeId, portId, displayName) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;

        const port = node.outputs.find(p => p.id === portId);
        if (port) port.displayName = displayName;
    },
} satisfies PortReducers

type PortReducers = {
    removeOutput        : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id) => void;
    addOutput           : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, port: Foundations.Port.Output) => void;
    setOutputDisplayName: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id, displayName: string) => void;
}
