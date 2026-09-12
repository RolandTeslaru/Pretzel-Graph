import { Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { toast } from "sonner";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { ShelfSDK } from "../ShelfSDK/sdk";
import type { WorkbenchSDKImpl } from "./sdk";

const { withCyclesRecompute } = Workbench.Document;

const setLocked = (workflowId: Workflow.Id, locked: boolean) => {
    const meta = LibrarySDK.state.workflowMetas[workflowId];

    if (meta)
        LibrarySDK.actions.workflow.upsertMeta({ ...meta, locked });
};

// Each edit a holder makes, mirrored on the read-only document through the same reducers.
// Events carry values, never blueprints: a new node's base is fetched from the shelf first
// and the derivative refolded here, exactly as the canvas would.
const reduceEvent = withCyclesRecompute((d: Workbench.Document, event: Workbench.Event) => {
    switch (event.type) {
        case "node:created":
            d.reducers.node.insert(d, event.node, event.position, event.staticValues as never);
            break;

        case "node:deleted":
            if (d.data.nodes[event.nodeId])
                d.reducers.node.remove(d, event.nodeId);
            break;

        case "node:moved":
            if (d.data.nodes[event.nodeId])
                d.reducers.layout.node.setPosition(d, event.nodeId, event.position);
            break;

        case "node:inputPortAdded":
            if (d.data.nodes[event.nodeId])
                d.reducers.port.addInput(d, event.nodeId, event.port);
            break;

        case "node:inputPortRemoved":
            if (d.data.nodes[event.nodeId])
                d.reducers.port.removeInput(d, event.nodeId, event.portId);
            break;

        case "edge:created": {
            const edge = Workflow.Edge.fromId(event.edgeId);

            d.reducers.edge.create(d, {
                source:       edge.source.nodeId,
                sourceHandle: edge.source.portId,
                target:       edge.target.nodeId,
                targetHandle: edge.target.portId,
            });
            break;
        }

        case "edge:deleted":
            if (d.cache.edges[event.edgeId])
                d.reducers.edge.remove(d, event.edgeId);
            break;

        case "field:set": {
            const field = d.selectors.field.get(d, event.nodeId, event.fieldId);

            if (!field)
                break;

            if (field.reconcile)
                d.reducers.node.derive(d, event.nodeId, { ...d.selectors.field.getValues(d, event.nodeId), [event.fieldId]: event.value as never });

            d.reducers.field.setValue(d, event.nodeId, event.fieldId, event.value as never);
            d.reducers.node.validate(d, event.nodeId);
            break;
        }

        case "workflow:globalFieldsChanged":
            d.reducers.workflow.setGlobalFields(d, event.globalFields);
            break;
    }

    // Mirrored, not authored: the holder's commit is what persists this.
    d.isDirty = false;
});

const applyEvent = async (sdk: WorkbenchSDKImpl, event: Workbench.Event) => {
    const base = event.type === "node:created"
        ? await ShelfSDK.actions.getBlueprint(event.node.blueprintId)
        : null;

    if (event.workflowId !== sdk.document.workflowId)
        return;

    const temporal = (sdk.useDocument as any).temporal.getState();

    temporal.pause();
    try {
        sdk.setDocument(d => {
            if (base)
                d.reducers.blueprint.register(d, base);

            reduceEvent(d, event);
        });
    }
    finally {
        temporal.resume();
    }
};

// The open workflow's own channel: a hold taken from inside a run makes the canvas
// read-only, its edits are mirrored as they land, and its release replaces the document
// with what the run actually wrote. Mirrored edits are kept out of the undo stack and
// applied strictly in order, since one may have to wait on a blueprint fetch.
export const handleWorkbenchEvent = (sdk: WorkbenchSDKImpl, event: Workbench.Event) => {
    if (event.workflowId !== sdk.document.workflowId)
        return;

    switch (event.type) {
        case "lock:acquired":
            setLocked(event.workflowId, true);
            toast.info("A run is editing this workflow");
            return;

        case "lock:released":
            return sdk.actions.workflow.refetch(event.workflowId);

        default:
            return applyEvent(sdk, event);
    }
};

export const subscribeToWorkbenchChannel = (sdk: WorkbenchSDKImpl, workflowId: Workflow.Id) => {
    unsubscribeFromWorkbenchChannel(sdk);

    sdk.runtime.channel.unsubscribe = RealtimeSDK.subscribeToChannel<Workbench.Event>(
        Workbench.Event.getChannel(workflowId),
        event => sdk.runtime.channel.events.add(event),
    );
};

export const unsubscribeFromWorkbenchChannel = (sdk: WorkbenchSDKImpl) => {
    sdk.runtime.channel.unsubscribe?.();
    sdk.runtime.channel.unsubscribe = null;
    sdk.runtime.channel.events.clear();
};
