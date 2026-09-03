import type { Workflow } from "@pretzel-graph/shared/domain";
import { Document } from "@pretzel-graph/shared/domain/Workbench/Document";
import type { WorkbenchSDK } from "./sdk";

// The document's reducers plus the editor's own — pointer and gesture state the document has
// no notion of.
export const workbenchReducers = {
    ...Document.reducers,
    setClickedNodeId        : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id | null) => { state.clickedNodeId = nodeId; },
    setSelectionContextMenu : (state: WorkbenchSDK.State, pos: { x: number, y: number } | null) => { state.selectionContextMenu = pos; },
    setPaneContextMenu      : (state: WorkbenchSDK.State, pos: { x: number, y: number } | null) => { state.paneContextMenu = pos; },
}
