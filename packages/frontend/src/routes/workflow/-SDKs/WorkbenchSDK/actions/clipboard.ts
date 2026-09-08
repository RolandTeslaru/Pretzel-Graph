import type { Workflow } from "@pretzel-graph/shared/domain";
import { WorkbenchSDK } from "../sdk";
import { Document } from "@pretzel-graph/shared/domain/Workbench/Document";
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { withCyclesRecompute, withAsyncCommit } from "../utils/actions";
import {
    type ClipboardPayload,
    CLIPBOARD_KIND,
    CLIPBOARD_VERSION,
    readClipboard,
    writeClipboard,
} from "../clipboard/payload";

const reducers = Document.reducers;

// Build a self-contained snapshot of the given nodes (+ the supplied edges)
// from current state. staticValues / credentials are captured here so the
// payload is frozen at copy time.
const buildPayload = (
    nodeIds: Workflow.Node.Id[],
    edgeIds: Workflow.Edge.Id[],
): ClipboardPayload | null => {
    const { data, cache } = WorkbenchSDK.document;

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

        await insertPayload(payload, position);
    }),
};

// Drops a payload into the current document: hydrates the blueprints it needs, then replays it
// through the paste reducer. Shared by clipboard paste and JSON import.
export const insertPayload = async (
    payload: ClipboardPayload,
    position?: { x: number, y: number },
    dependencies?: Workflow.Data["dependencies"],
): Promise<void> => {
    // The payload may have been copied from another workflow, so its blueprints are not
    // necessarily registered here — fetch any that are missing before the nodes land.
    const blueprintIds = payload.nodes.flatMap(node => node.reconciledBlueprintId
        ? [node.blueprintId, node.reconciledBlueprintId]
        : [node.blueprintId]);

    await ShelfSDK.actions.hydrateBatch(blueprintIds);

    WorkbenchSDK.setDocument(withCyclesRecompute(d => {
        for (const blueprintId of blueprintIds) {
            const blueprint = ShelfSDK.state.blueprints[blueprintId];
            if (blueprint)
                reducers.blueprint.registerAs(d, blueprintId, blueprint);
        }

        reducers.clipboard.pasteFromPayload(d, payload, position);

        if (dependencies)
            adoptDependencies(d, payload, dependencies);
    }));
};

// Sub-workflow nodes carry their dependency snapshot inside the source document, so it is
// registered after the nodes land (registering earlier would be pruned as unreferenced).
const adoptDependencies = (
    d: Document,
    payload: ClipboardPayload,
    dependencies: Workflow.Data["dependencies"],
): void => {
    const referenced = new Set(
        payload.nodes.flatMap(node => node.dependencyRef ? [node.dependencyRef.workflowId] : [])
    );
    if (referenced.size === 0) return;

    const registered = new Set<string>();

    for (const dependency of Object.values(dependencies.published))
        if (referenced.has(dependency.workflow_id)) {
            reducers.dependency.register(d, "publication", dependency);
            registered.add(`publication:${dependency.workflow_id}`);
        }

    for (const dependency of Object.values(dependencies.draft))
        if (referenced.has(dependency.workflow_id)) {
            reducers.dependency.register(d, "draft", dependency);
            registered.add(`draft:${dependency.workflow_id}`);
        }

    // The nodes were created before their snapshot existed, so their shapes resolve to nothing.
    for (const node of Object.values(d.data.nodes)) {
        const ref = node.dependencyRef;
        if (!ref) continue;
        if (!registered.has(`${ref.mode}:${ref.workflowId}`)) continue;

        reducers.cache.resolvedShape.recreate(d, node.id);
        reducers.node.validate(d, node.id);
    }
};
