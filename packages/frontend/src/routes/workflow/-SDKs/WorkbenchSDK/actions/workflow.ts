import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withCommit } from "../utils/actions"
import { Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { ShelfSDK } from "../../ShelfSDK/sdk";

export function createWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        close:    (...props) => setState(s => { reducers.workflow.close(s,    ...props) }),
        open:     (...props) => setState(s => { reducers.workflow.open(s,     ...props) }),
        validate: (...props) => setState(s => { reducers.workflow.validate(s, ...props) }),
        setFields: withCommit((...props) => setState(s => { reducers.workflow.setFields(s, ...props) })),
        load: async (workflowId, abortSignal) => {
            try {
                const { workflow } = await Workbench.API.Workflow.get(api, { workflowId }, abortSignal)

                
                if (!workflow)
                    throw new Error("Workflow not found")
                
                Workflow.Schema.parse(workflow);
                const { data: _data, ...meta } = workflow;
                
                // Also update the library metadata cache
                LibrarySDK.actions.workflow.upsertMeta(meta);
                
                // Hydrate every blueprint the nodes reference — base ids and reconciled ids alike
                // (getBatch reconstructs reconciled ids server-side) — so derive-on-read resolves
                // synchronously once the graph paints.
                const blueprintIds = sdk.selectors.getBlueprintIds(sdk.state, workflow);
                await ShelfSDK.actions.hydrateBatch(blueprintIds);

                setState(s => {
                    reducers.workflow.open(s, workflow)
                });

                // Replay polymorphic resolution from edges — needs blueprints hydrated and runs
                // against the stored slim nodes.
                setState(s => { reducers.workflow.reconstructPolymorphism(s) });

                // Normalize legacy fat nodes: drop stored values that equal blueprint defaults
                // (derived on read). Needs blueprints hydrated. Marks dirty if anything changed.
                setState(s => {
                    for (const nodeId of Object.keys(s.data.nodes) as Workflow.Node.Id[]) {
                        s.reducers.node.pruneDefaultStaticValues(s, nodeId);
                        s.reducers.node.pruneDefaultUI(s, nodeId);
                    }
                });
                // Persist the slimmed version (no-ops if nothing was pruned).
                await sdk.actions.commit();

                // Hydration (empty INITIAL -> loaded workflow) would otherwise be recorded
                // as an undoable step; drop it so undo isn't armed on a fresh load.
                (sdk.useStore as any).temporal.getState().clear();

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
