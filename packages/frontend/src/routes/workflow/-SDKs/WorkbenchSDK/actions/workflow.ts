import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withCommit, withCyclesRecompute } from '../utils/actions';
import { Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { AsyncEventQueueHandler } from "@/SDKs/Realtime/EventQueue";
import { toast } from "sonner";
import { requestWorkflowRepair } from "./workflowRepairDialog";

export function createWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;

    let unsubscribeChannel: (() => void) | null = null;

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
                reducers.node.insert(d, event.node, event.position, event.staticValues as never);
                break;

            case "node:deleted":
                if (d.data.nodes[event.nodeId])
                    reducers.node.remove(d, event.nodeId);
                break;

            case "edge:created": {
                const edge = Workflow.Edge.fromId(event.edgeId);

                reducers.edge.create(d, {
                    source:       edge.source.nodeId,
                    sourceHandle: edge.source.portId,
                    target:       edge.target.nodeId,
                    targetHandle: edge.target.portId,
                });
                break;
            }

            case "edge:deleted":
                if (d.cache.edges[event.edgeId])
                    reducers.edge.remove(d, event.edgeId);
                break;

            case "field:set":
                Workbench.Operations.field.set(d, event.nodeId, event.fieldId, event.value);
                break;
        }

        // Mirrored, not authored: the holder's commit is what persists this.
        d.isDirty = false;
    });

    
    const applyEvent = async (event: Workbench.Event) => {
        const base = event.type === "node:created"
            ? await ShelfSDK.actions.getBlueprint(event.node.blueprintId)
            : null;

        if (event.workflowId !== sdk.document.workflowId)
            return;

        const temporal = (sdk.useDocument as any).temporal.getState();

        temporal.pause();
        try {
            setDocument(d => {
                if (base)
                    reducers.blueprint.register(d, base);

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
    const events = new AsyncEventQueueHandler<Workbench.Event>(event => {
        if (event.workflowId !== sdk.document.workflowId)
            return;

        switch (event.type) {
            case "lock:acquired":
                setLocked(event.workflowId, true);
                toast.info("A run is editing this workflow");
                return;

            case "lock:released":
                return actions.refetch(event.workflowId);

            default:
                return applyEvent(event);
        }
    });

    const subscribeChannel = (workflowId: Workflow.Id) => {
        unsubscribeChannel?.();

        unsubscribeChannel = RealtimeSDK.subscribeToChannel<Workbench.Event>(
            Workbench.Event.getChannel(workflowId),
            event => events.add(event),
        );
    };

    const actions = {
        close: () => {
            unsubscribeChannel?.();
            unsubscribeChannel = null;
            events.clear();

            setDocument(d => { reducers.workflow.close(d) });
        },
        open:     (...props) => setDocument(d => { reducers.workflow.open(d,     ...props) }),
        validate: (...props) => setDocument(d => { reducers.workflow.validate(d, ...props) }),
        setFields: withCommit((...props) => setDocument(d => { reducers.workflow.setFields(d, ...props) })),
        load: async (workflowId, abortSignal) => {
            try {
                const { workflow, blueprints, repairs } = await Workbench.API.Workflow.get(api, { workflowId }, abortSignal)

                
                if (!workflow)
                    throw new Error("Workflow not found")
                
                const parsedWorkflow = Workflow.Schema.parse(workflow);

                // Repair previews and application both need the current base blueprints available,
                // but hydrating the catalogue does not mutate the workflow itself.
                ShelfSDK.actions.upsertBlueprints(blueprints);

                const approved = await requestWorkflowRepair(parsedWorkflow, repairs, abortSignal);
                if (!approved) {
                    if (abortSignal.aborted)
                        throw abortSignal.reason ?? new DOMException("Workflow load aborted", "AbortError");

                    throw new Error("Workflow repair was cancelled");
                }

                const repaired = Workflow.Repair.applyAll(parsedWorkflow.data, repairs);
                const workflowToOpen: Workflow = {
                    ...parsedWorkflow,
                    data: repaired.data,
                };
                const { data: _data, ...meta } = workflowToOpen;

                // Also update the library metadata cache
                LibrarySDK.actions.workflow.upsertMeta(meta);

                setDocument(d => {
                    // Seeded before open, which builds the cache off d.blueprints.
                    reducers.blueprint.registerMany(d, blueprints);
                    reducers.workflow.open(d, workflowToOpen, {
                        repaired: repaired.applied > 0,
                    })
                });

                // All workflows are migrated (slim nodes, id-array edges, slim deps), so the
                // one-time normalization passes (reconstructPolymorphism / pruneDefault* /
                // dependency.pruneDefaults) are no-ops and were removed. `open` may still prune
                // dangling edges, so persist only when it actually changed something.
                if (sdk.document.isDirty)
                    await sdk.actions.commit();

                // Hydration (empty INITIAL -> loaded workflow) would otherwise be recorded
                // as an undoable step; drop it so undo isn't armed on a fresh load.
                (sdk.useDocument as any).temporal.getState().clear();

                subscribeChannel(workflowId);

                // Fire and forget
                sdk.actions.dependency.checkUpdates()
            } catch (error) {
                console.error("Failed to load workflow", error);
                throw error;
            }
        },
        // Replaces the document in place after someone else wrote it. Editor state is untouched;
        // the undo stack is dropped because it describes a document that no longer exists.
        refetch: async (workflowId) => {
            if (sdk.document.workflowId !== workflowId)
                return;

            const { workflow, blueprints, repairs } = await Workbench.API.Workflow.get(api, { workflowId });

            if (sdk.document.workflowId !== workflowId)
                return;

            const parsedWorkflow = Workflow.Schema.parse(workflow);
            const repaired = Workflow.Repair.applyAll(parsedWorkflow.data, repairs);
            const { data: _data, ...meta } = parsedWorkflow;

            ShelfSDK.actions.upsertBlueprints(blueprints);
            LibrarySDK.actions.workflow.upsertMeta(meta);

            setDocument(d => {
                reducers.blueprint.registerMany(d, blueprints);
                reducers.workflow.open(d, { ...parsedWorkflow, data: repaired.data }, {
                    repaired: repaired.applied > 0,
                });
            });

            (sdk.useDocument as any).temporal.getState().clear();

            toast.info("Workflow updated");
        },
    } satisfies WorkflowActions;

    return actions;
}

export type WorkflowActions = {
    close:    DropFirstArg<WorkbenchSDK.Reducers['workflow']['close']>;
    open:     DropFirstArg<WorkbenchSDK.Reducers['workflow']['open']>;
    validate: DropFirstArg<WorkbenchSDK.Reducers['workflow']['validate']>;
    setFields: DropFirstArg<WorkbenchSDK.Reducers['workflow']['setFields']>;
    load: (workflowId: Workflow.Id, abortSignal: AbortSignal) => Promise<void>;
    refetch: (workflowId: Workflow.Id) => Promise<void>;
};
