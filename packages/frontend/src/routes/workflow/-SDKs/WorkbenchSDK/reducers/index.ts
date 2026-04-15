import type { Workflow } from "@vx-agent-editor/shared/domain";
import { edgeReducers } from "./edge";
import { fieldReducers } from "./field";
import { inputReducers } from "./input";
import { layoutReducers } from "./layout";
import { nodeReducers } from "./node";
import { portReducers } from "./port";
import { workflowReducers } from "./workflow";
import type { WorkbenchSDK } from "../sdk";
import { clipboardReducers } from "./clipboard";

export const workbenchReducers = {
    field: fieldReducers,
    edge: edgeReducers,
    node: nodeReducers,
    port: portReducers,
    input: inputReducers,
    workflow: workflowReducers,
    layout: layoutReducers,
    clipboard: clipboardReducers,
    setClickedNodeId: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id | null) => { state.clickedNodeId = nodeId; },
}
