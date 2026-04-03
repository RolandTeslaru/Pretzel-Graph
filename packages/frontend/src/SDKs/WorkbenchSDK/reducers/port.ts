import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { edgeReducers } from "./edge";

export const portReducers = {
    removeOutput: (s, nodeId, portId) => {
        s.isDirty = true;
        const node = s.workflow.data.nodes[nodeId];
        if (!node) return;

        const edgeId = s.cache.outputHandlesMap[nodeId]?.[portId];
        if (edgeId)
            edgeReducers.remove(s, edgeId);

        node.outputs = node.outputs.filter(p => p.id !== portId) as typeof node.outputs;
    },
} satisfies PortReducers

type PortReducers = {
    removeOutput: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id) => void;
}
