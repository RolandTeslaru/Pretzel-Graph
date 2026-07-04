import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withCommit } from "../utils/actions"
import { Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { ShelfSDK } from "../../ShelfSDK/sdk";

export function createWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    // For every reconcilable node, ensure its reconciled blueprint is cached and the node points
    // at it. v2 nodes carrying reconciledBlueprintId get warmed; migrated v1 nodes (and any node
    // whose reconcile values differ from the blueprint defaults) get it reconstructed.
    const reconstructReconciledBlueprints = async () => {
        const { nodes, staticValues } = sdk.state.data;

        const assignments = await Promise.all(Object.values(nodes).map(async node => {
            const base = ShelfSDK.state.blueprints[node.blueprintId];
            if (!base || !base.fields.some(f => f.reconcile)) return null;

            const values:   Record<string, any> = {};
            const defaults: Record<string, any> = {};
            for (const f of base.fields) {
                defaults[f.id] = (f as any).initialValue;
                values[f.id]   = staticValues[node.id]?.[f.id] ?? (f as any).initialValue;
            }

            const reconciledId = Blueprint.createReconciledId(base.id, base.fields, values);
            // At the blueprint's default reconcile state the base blueprint is already correct.
            if (reconciledId === Blueprint.createReconciledId(base.id, base.fields, defaults)) return null;

            await ShelfSDK.actions.getReconciledBlueprint(base, values); // warms the cache under reconciledId
            return [node.id, reconciledId] as const;
        }));

        const valid = assignments.filter(Boolean) as Array<readonly [Workflow.Node.Id, Blueprint.ReconciledId]>;
        if (valid.length === 0) return;

        setState(s => {
            for (const [nodeId, reconciledId] of valid)
                if (s.data.nodes[nodeId]) s.data.nodes[nodeId].reconciledBlueprintId = reconciledId;
        });
    };

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

                // Hydrate every base blueprint the top-level nodes reference so derive-on-read
                // resolves synchronously once the graph paints.
                const blueprintIds = sdk.selectors.getBlueprintIds(sdk.state, workflow);
                await ShelfSDK.actions.hydrateBatch(blueprintIds);

                setState(s => {
                    reducers.workflow.open(s, workflow)
                });

                // Warm/reconstruct reconciled blueprints, then replay polymorphic resolution from
                // edges — both need blueprints hydrated and run against the stored slim nodes.
                await reconstructReconciledBlueprints();
                setState(s => { reducers.workflow.reconstructPolymorphism(s) });

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
