import { Document } from "@pretzel-graph/shared/domain/Workbench/Document";
import type { WorkbenchSDK } from "./sdk";

export const workbenchSelectors = {
    ...Document.selectors,
    getClickedNode: (s: WorkbenchSDK.State) => s.clickedNodeId ? s.data.nodes[s.clickedNodeId] ?? null : null,
}

export type WorkbenchSDKSelectors = typeof workbenchSelectors
