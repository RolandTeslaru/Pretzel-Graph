import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withCommit } from "../utils/actions"
import { Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { requestWorkflowRepair } from "./workflowRepairDialog";

export function createWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;

    return {
        close:    (...props) => setDocument(d => { reducers.workflow.close(d,    ...props) }),
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

                // Fire and forget
                sdk.actions.dependency.checkUpdates()
            } catch (error) {
                console.error("Failed to load workflow", error);
                throw error;
            }
        }
    } satisfies WorkflowActions;
}

export type WorkflowActions = {
    close:    DropFirstArg<WorkbenchSDK.Reducers['workflow']['close']>;
    open:     DropFirstArg<WorkbenchSDK.Reducers['workflow']['open']>;
    validate: DropFirstArg<WorkbenchSDK.Reducers['workflow']['validate']>;
    setFields: DropFirstArg<WorkbenchSDK.Reducers['workflow']['setFields']>;
    load: (workflowId: Workflow.Id, abortSignal: AbortSignal) => Promise<void>;
};
