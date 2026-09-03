import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withAsyncCommit, withCommit, withCyclesRecompute } from "../utils/actions"
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { Foundations, SystemError, Vault, Workbench, type Workflow } from "@pretzel-graph/shared/domain";
import { VaultSDK } from "@/SDKs/VaultSDK/sdk";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { toast } from "sonner";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { extractExposedPorts } from "@pretzel-graph/shared/subworkflow";

// Policy, not document state: attach a credential automatically only when exactly one vault
// instance matches the template. Optional templates are opt-in and never auto-attached.
const resolveCredentialDefaults = (blueprint: Foundations.Blueprint) => {
    const defaults: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id> = {};

    for (const template of blueprint.credentials ?? []) {
        if (template.optional)
            continue;

        const instances = VaultSDK.selectors.byTemplateId(VaultSDK.state, template.id);

        if (instances.length === 1)
            defaults[template.id] = instances[0].id;
    }

    return defaults;
};

export function createNodeActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        remove:            withCommit((...props) => {setState(withCyclesRecompute(s => { reducers.node.remove(s, ...props) })) }),
        duplicate:         withCommit((...props) => setState(s => { reducers.node.duplicate(s,         ...props) })),
        setDisabled:       withCommit((...props) => setState(s => { reducers.node.setDisabled(s,       ...props) })),
        setMinimized:      withCommit((...props) => setState(s => { reducers.node.setMinimized(s,      ...props) })),
        setFlipped:        withCommit((...props) => setState(s => { reducers.node.setFlipped(s,        ...props) })),
        setDisplayName:    withCommit((...props) => setState(s => { reducers.node.setDisplayName(s,    ...props) })),
        setDescription:    withCommit((...props) => setState(s => { reducers.node.setDescription(s,    ...props) })),
        setSignalStrategy: withCommit((...props) => setState(s => { reducers.node.setSignalStrategy(s, ...props) })),
        
        validate:          (...props) => { setState(s => { reducers.node.validate(s,       ...props) }) },
        clearIssues:       (...props) => { setState(s => { reducers.node.clearIssues(s,    ...props) }) },

        recreate:          withAsyncCommit( async (nodeId, ) => {
            const s = sdk.state;
            const node = s.data.nodes[nodeId];
            
            await ShelfSDK.actions.hydrateBlueprint(node.blueprintId)
            
            const blueprintId = node.blueprintId;
            
            const blueprint = ShelfSDK.state.blueprints[node.blueprintId];
            
            if(blueprintId === "Core.SubWorkflow.Execute") {
                toast.error("Cannot manually set a subworkflow dependency. Please use the dependency selector field to select and load a workflow as a dependency.")
                return;
            }
            
            
            const credentialDefaults = resolveCredentialDefaults(blueprint);

            setState(withCyclesRecompute(s => { reducers.node.recreate(s, nodeId, blueprint, credentialDefaults)}));
        }),
        recreateAll:       withAsyncCommit( async () => {
            const s = sdk.state;
            const nodes = Object.values(s.data.nodes);

            // Nodes with a dependency (e.g. an attached subworkflow) derive their shape from
            // that dependency, not a static blueprint, so they can't be blindly recreated — skip them.
            const recreatable = nodes.filter(n => !n.dependencyRef);

            // Hydrate each distinct blueprint once (parallel), so we recreate from fresh blueprints.
            const blueprintIds = [...new Set(recreatable.map(n => n.blueprintId))];
            await Promise.all(blueprintIds.map(id => ShelfSDK.actions.hydrateBlueprint(id)));

            const blueprints = ShelfSDK.state.blueprints;

            // Run every recreate in a single commit + cycles recompute → one undo step.
            setState(withCyclesRecompute(s => {
                for (const node of recreatable) {
                    const blueprint = blueprints[node.blueprintId];
                    if (!blueprint) {
                        console.error(`Skipping recreate for ${node.id}: blueprint ${node.blueprintId} failed to hydrate`);
                        continue;
                    }
                    reducers.node.recreate(s, node.id, blueprint, resolveCredentialDefaults(blueprint));
                }
            }));
        }),
        create:        withAsyncCommit( async (...props) => { 
            const blueprint = props[0];

            let nodeId: Workflow.Node.Id | null = null;
            
            // If the blueprint is pre-wired to a dependency not yet in the store, fetch it lazily.
            // On failure, remove the node — it can't function without its dependency data.
            if (blueprint.dependencyRef) {
                const { workflowId, mode } = blueprint.dependencyRef;
                const depStore = mode === "publication"
                    ? sdk.state.data.dependencies.published
                    : sdk.state.data.dependencies.draft;

                if (!depStore[workflowId]) {
                    const fetchDepPromise = mode === "publication"
                        ? Workbench.API.Dependency.Published.load(api, { dependencyId: workflowId })
                        : Workbench.API.Dependency.Draft.load(api, { dependencyId: workflowId });

                    fetchDepPromise.then(({ dependency }) => {
                        sdk.actions.dependency.registerDependency(dependency as any);
                    })
                    fetchDepPromise.catch(err => {
                        const error = SystemError.fromUnknown(err)
                        console.error("Failed to load dependency for node", error)
                        toast.error(`Failed to load dependency for node: ${error.message}`)
                        if (nodeId) sdk.actions.node.remove(nodeId)
                    })
                }
            }

            // Caller-supplied assignments win over the auto-attach defaults.
            const credentials = { ...resolveCredentialDefaults(blueprint), ...(props[3] ?? {}) };

            setState(s => { 
                nodeId = reducers.node.create(s, props[0], props[1], props[2], credentials) 
            })
}),
    } satisfies NodeActions;
}

export type NodeActions = {
    remove              : DropFirstArg<WorkbenchSDK.Reducers['node']['remove']>;
    create              : DropFirstArg<WorkbenchSDK.Reducers['node']['create']>;
    duplicate           : DropFirstArg<WorkbenchSDK.Reducers['node']['duplicate']>;
    setSignalStrategy   : DropFirstArg<WorkbenchSDK.Reducers['node']['setSignalStrategy']>;
    setDisabled         : DropFirstArg<WorkbenchSDK.Reducers['node']['setDisabled']>;
    setMinimized        : DropFirstArg<WorkbenchSDK.Reducers['node']['setMinimized']>;
    setFlipped          : DropFirstArg<WorkbenchSDK.Reducers['node']['setFlipped']>;
    setDisplayName      : DropFirstArg<WorkbenchSDK.Reducers['node']['setDisplayName']>;
    setDescription      : DropFirstArg<WorkbenchSDK.Reducers['node']['setDescription']>;
    validate            : DropFirstArg<WorkbenchSDK.Reducers['node']['validate']>;
    clearIssues         : DropFirstArg<WorkbenchSDK.Reducers['node']['clearIssues']>;
    recreate            : (nodeId: Workflow.Node.Id) => void;
    recreateAll         : () => void;
};
