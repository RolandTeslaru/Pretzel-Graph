import { Foundations } from "../../../../Foundations";
import { Workflow } from "../../../../Workflow";
import type { Document } from "../../index";
import { nodeLifecycleReducers, type NodeLifecycleReducers } from "./lifecycle";
import { nodeValueReducers, type NodeValueReducers } from "./values";
import { nodePolymorphismReducers, type NodePolymorphismReducers } from "./polymorphism";

type NodeId = Workflow.Node.Id

export const nodeReducers: NodeReducers = {
    // Lifecycle: create / remove / recreate / duplicate / apply derivative / attach dependency / wipe / disconnect
    // + validate / clearIssues (kept here since lifecycle is their primary consumer).
    ...nodeLifecycleReducers,
    ...nodeValueReducers,

    polymorphism: nodePolymorphismReducers,

    // --- meta setters ---
    setSignalStrategy: (d, nodeId, strategy) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) return;

        d.reducers.field.setValue(d, nodeId, "signalDependency" as Foundations.Field.Id, strategy);
    },
    setDisabled: (d, nodeId, isDisabled) => {
        d.isDirty = true;
        d.data.nodes[nodeId].isDisabled = isDisabled;
    },
    setMinimized: (d, nodeId, isMinimized) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        node.ui.isMinimized = isMinimized;
    },
    setFlipped: (d, nodeId, isFlipped) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        node.ui.isFlipped = isFlipped;
    },
    setDisplayName: (d, nodeId, newDisplayName) => {
        d.isDirty = true;

        const node = d.data.nodes[nodeId];

        node.ui.displayName = newDisplayName;
    },
    setDescription: (d, nodeId, newDescription) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        node.ui.description = newDescription;
    },
    setIconColor: (d, nodeId, accentToken) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) return;
        // Drop the key entirely when cleared, so it stays out of serialized JSON.
        if (accentToken) {
            node.ui.iconColor = accentToken;
        } else {
            delete node.ui?.iconColor;
        }
    },
}

export interface NodeMetaReducers {
    setSignalStrategy : (document: Document, nodeId: NodeId, strategy: "AND" | "OR" | "XOR") => void;
    setDisabled       : (document: Document, nodeId: NodeId, isDisabled: boolean) => void;
    setMinimized      : (document: Document, nodeId: NodeId, isMinimized: boolean) => void;
    setFlipped        : (document: Document, nodeId: NodeId, isFlipped: boolean) => void;
    setDisplayName    : (document: Document, nodeId: NodeId, newDisplayName: string) => void;
    setDescription    : (document: Document, nodeId: NodeId, newDescription: string) => void;
    setIconColor      : (document: Document, nodeId: NodeId, accentToken: string | null | undefined) => void;
}

export type NodeReducers =
    & NodeLifecycleReducers
    & NodeValueReducers
    & NodeMetaReducers
    & { polymorphism: NodePolymorphismReducers }
