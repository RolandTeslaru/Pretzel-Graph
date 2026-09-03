import type { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "./sdk";

// The editor's own reducers — pointer and gesture state the document has no notion of.
// Document reducers live on Document.reducers and take the document store.
export const editorReducers = {
    setClickedNodeId        : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id | null) => { state.clickedNodeId = nodeId; },
    setSelectionContextMenu : (state: WorkbenchSDK.State, pos: { x: number, y: number } | null) => { state.selectionContextMenu = pos; },
    setPaneContextMenu      : (state: WorkbenchSDK.State, pos: { x: number, y: number } | null) => { state.paneContextMenu = pos; },
}
