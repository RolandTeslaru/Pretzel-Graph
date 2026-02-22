import type { Workflow } from "@vx-agent-editor/shared/domain";
import { edgeReducers } from "./edge";
import { fieldReducers } from "./field";
import { inputReducers } from "./input";
import { layoutReducers } from "./layout";
import { nodeReducers } from "./node";
import { workflowReducers } from "./workflow";
import type { WorkbenchSDK } from "../sdk";
import { clipboardReducers } from "./clipboard";

export const workbenchReducers = {
    field: fieldReducers,
    edge: edgeReducers,
    node: nodeReducers,
    input: inputReducers,
    workflow: workflowReducers,
    layout: layoutReducers,
    clipboard: clipboardReducers,
    createNodeId: nodeReducers.createId,
    createEdgeId: edgeReducers.createId,
    setClickedNodeId: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id | null) => { state.clickedNodeId = nodeId; },
}
