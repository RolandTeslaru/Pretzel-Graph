import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../../sdk";
import { fieldReducers } from "../field";
import { nodeLifecycleReducers, type NodeLifecycleReducers } from "./lifecycle";
import { nodeValueReducers, type NodeValueReducers } from "./values";
import { nodePolymorphismReducers, type NodePolymorphismReducers } from "./polymorphism";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id

export const nodeReducers = {
    // Lifecycle: create / remove / recreate / duplicate / reconcile / wipe / disconnect
    // + validate / clearIssues (kept here since lifecycle is their primary consumer).
    ...nodeLifecycleReducers,
    ...nodeValueReducers,

    polymorphism: nodePolymorphismReducers,

    // --- meta setters ---
    setSignalStrategy: (s, nodeId, strategy) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;

        fieldReducers.setValue(s, nodeId, "signalDependency" as Foundations.Field.Id, strategy);
    },
    setDisabled: (s, nodeId, isDisabled) => {
        s.isDirty = true;
        s.data.nodes[nodeId].isDisabled = isDisabled;
    },
    setMinimized: (s, nodeId, isMinimized) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        node.ui.isMinimized = isMinimized;
    },
    setFlipped: (s, nodeId, isFlipped) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        node.ui.isFlipped = isFlipped;
    },
    setDisplayName: (s, nodeId, newDisplayName) => {
        s.isDirty = true;

        const node = s.data.nodes[nodeId];

        node.ui.displayName = newDisplayName;
    },
    setDescription: (s, nodeId, newDescription) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        node.ui.description = newDescription;
    },
    setIconColor: (s, nodeId, accentToken) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;
        // Drop the key entirely when cleared, so it stays out of serialized JSON.
        if (accentToken) {
            node.ui.iconColor = accentToken;
        } else {
            delete node.ui?.iconColor;
        }
    },
} satisfies NodeReducers

export interface NodeMetaReducers {
    setSignalStrategy : (s: S, nodeId: NodeId, strategy: "AND" | "OR" | "XOR") => void;
    setDisabled       : (s: S, nodeId: NodeId, isDisabled: boolean) => void;
    setMinimized      : (s: S, nodeId: NodeId, isMinimized: boolean) => void;
    setFlipped        : (s: S, nodeId: NodeId, isFlipped: boolean) => void;
    setDisplayName    : (s: S, nodeId: NodeId, newDisplayName: string) => void;
    setDescription    : (s: S, nodeId: NodeId, newDescription: string) => void;
    setIconColor      : (s: S, nodeId: NodeId, accentToken: string | null | undefined) => void;
}

export type NodeReducers =
    & NodeLifecycleReducers
    & NodeValueReducers
    & NodeMetaReducers
    & { polymorphism: NodePolymorphismReducers }
