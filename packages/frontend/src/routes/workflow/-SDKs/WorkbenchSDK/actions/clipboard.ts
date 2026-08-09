import type { Workflow } from "@pretzel-graph/shared/domain";
import { WorkbenchSDK } from "../sdk";
import { workbenchReducers as reducers } from "../reducers";
import { withCyclesRecompute, withAsyncCommit } from "../utils/actions";
import {
    type ClipboardPayload,
    CLIPBOARD_KIND,
    CLIPBOARD_VERSION,
    readClipboard,
    writeClipboard,
} from "../clipboard/payload";

// Build a self-contained snapshot of the given nodes (+ the supplied edges)
// from current state. staticValues / credentials are captured here so the
// payload is frozen at copy time.
const buildPayload = (
    nodeIds: Workflow.Node.Id[],
    edgeIds: Workflow.Edge.Id[],
): ClipboardPayload | null => {
    const { data, cache } = WorkbenchSDK.state;

    const nodes: ClipboardPayload["nodes"] = [];
    const layout: ClipboardPayload["layout"] = {};
    const staticValues: ClipboardPayload["staticValues"] = {};
    const fieldExpressions: ClipboardPayload["fieldExpressions"] = {};
    const credentialInstanceIds: ClipboardPayload["credentialInstanceIds"] = {};

    for (const nodeId of nodeIds) {
        const node = data.nodes[nodeId];
        if (!node) {
            console.error(`Node ${nodeId} not found`);
            continue;
        }
        nodes.push(node);
        if (data.ui.layout[nodeId]) layout[nodeId] = data.ui.layout[nodeId];
        if (data.staticValues[nodeId]) staticValues[nodeId] = data.staticValues[nodeId] as any;
        if (data.fieldExpressions[nodeId]) fieldExpressions[nodeId] = data.fieldExpressions[nodeId];
        if (data.credentialInstanceIds[nodeId]) credentialInstanceIds[nodeId] = data.credentialInstanceIds[nodeId];
    }

    if (nodes.length === 0) return null;

    const edges: ClipboardPayload["edges"] = [];
    for (const edgeId of edgeIds) {
        const edge = cache.edges[edgeId];
        if (edge) edges.push(edge);
    }

    return {
        kind: CLIPBOARD_KIND,
        version: CLIPBOARD_VERSION,
        nodes,
        edges,
        layout,
        staticValues,
        fieldExpressions,
        credentialInstanceIds,
    };
};

export const clipboardActions = {
    copy: async (): Promise<void> => {
        const selection = WorkbenchSDK.state.lastSelection;
        if (!selection) return;

        const payload = buildPayload(
            selection.nodes.map(n => n.id as Workflow.Node.Id),
            selection.edges.map(e => e.id as Workflow.Edge.Id),
        );
        if (payload) await writeClipboard(payload);
    },

    copyNode: async (nodeId: Workflow.Node.Id): Promise<void> => {
        const payload = buildPayload([nodeId], []);
        if (payload) await writeClipboard(payload);
    },

    paste: withAsyncCommit(async (position?: { x: number, y: number }): Promise<void> => {
        const payload = await readClipboard();
        if (!payload) return;
        WorkbenchSDK.useStore.setState(withCyclesRecompute(s => {
            reducers.clipboard.pasteFromPayload(s, payload, position);
        }));
    }),
};
