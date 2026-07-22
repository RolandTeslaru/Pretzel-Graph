import type { Workflow } from "@pretzel-graph/shared/domain";
import { edgeReducers } from "./edge";
import { fieldReducers } from "./field";
import { inputReducers } from "./input";
import { layoutReducers } from "./layout";
import { nodeReducers } from "./node";
import { portReducers } from "./port";
import { workflowReducers } from "./workflow";
import type { WorkbenchSDK } from "../sdk";
import { clipboardReducers } from "./clipboard";
import { selectionReducers } from "./selection";
import { dependencyReducers } from "./dependency";
import { cacheReducers } from "./cache";
import { credentialReducers } from "./credential";

export const workbenchReducers = {
    cache                   : cacheReducers,
    field                   : fieldReducers,
    edge                    : edgeReducers,
    node                    : nodeReducers,
    credential              : credentialReducers,
    port                    : portReducers,
    input                   : inputReducers,
    workflow                : workflowReducers,
    layout                  : layoutReducers,
    clipboard               : clipboardReducers,
    selection               : selectionReducers,
    dependency              : dependencyReducers,
    setClickedNodeId        : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id | null) => { state.clickedNodeId = nodeId; },
    setSelectionContextMenu : (state: WorkbenchSDK.State, pos: { x: number, y: number } | null) => { state.selectionContextMenu = pos; },
    setPaneContextMenu      : (state: WorkbenchSDK.State, pos: { x: number, y: number } | null) => { state.paneContextMenu = pos; },
}
