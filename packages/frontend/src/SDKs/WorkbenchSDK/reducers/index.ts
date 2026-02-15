import type { Workflow } from "@vx-agent-editor/shared/domain";
import { edgeReducers } from "./edge";
import { fieldReducers } from "./field";
import { inputReducers } from "./input";
import { layoutReducers } from "./layout";
import { nodeReducers } from "./node";
import { workflowReducers } from "./workflow";
import type { WorkbenchSDK } from "../sdk";

export const workbenchReducers = {
    field: fieldReducers,
    edge: edgeReducers,
    node: nodeReducers,
    input: inputReducers,
    workflow: workflowReducers,
    layout: layoutReducers,
    createNodeId: nodeReducers.createId,
    createEdgeId: edgeReducers.createId,
    setClickedNodeId: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => { state.clickedNodeId = nodeId; },
}
