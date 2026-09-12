import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withAsyncCommit, withCommit, withCyclesRecompute, createToastPromise } from "../utils/actions"
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
    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;

    return {
        remove:            withCommit((...props) => {setDocument(withCyclesRecompute(d => { reducers.node.remove(d, ...props) })) }),
        duplicate:         withCommit((...props) => setDocument(d => { reducers.node.duplicate(d,         ...props) })),
        setDisabled:       withCommit((...props) => setDocument(d => { reducers.node.setDisabled(d,       ...props) })),
        setMinimized:      withCommit((...props) => setDocument(d => { reducers.node.setMinimized(d,      ...props) })),
        setFlipped:        withCommit((...props) => setDocument(d => { reducers.node.setFlipped(d,        ...props) })),
        setDisplayName:    withCommit((...props) => setDocument(d => { reducers.node.setDisplayName(d,    ...props) })),
        setDescription:    withCommit((...props) => setDocument(d => { reducers.node.setDescription(d,    ...props) })),
        setSignalStrategy: withCommit((...props) => setDocument(d => { reducers.node.setSignalStrategy(d, ...props) })),
        
        validate:          (...props) => { setDocument(d => { reducers.node.validate(d,       ...props) }) },
        clearIssues:       (...props) => { setDocument(d => { reducers.node.clearIssues(d,    ...props) }) },

        recreate:          withAsyncCommit( async (nodeId, ) => {
            const s = sdk.document;
            const node = s.data.nodes[nodeId];
            
            await ShelfSDK.actions.hydrateBlueprint(node.blueprintId)
            
            const blueprintId = node.blueprintId;
            
            const blueprint = ShelfSDK.state.blueprints[node.blueprintId];
            
            if(blueprintId === "Core.SubWorkflow.Execute") {
                toast.error("Cannot manually set a subworkflow dependency. Please use the dependency selector field to select and load a workflow as a dependency.")
                return;
            }
            
            
            const credentialDefaults = resolveCredentialDefaults(blueprint);

            setDocument(withCyclesRecompute(d => { reducers.node.recreate(d, nodeId, blueprint, credentialDefaults)}));
        }),
        recreateAll:       withAsyncCommit( async () => {
            const s = sdk.document;
            const nodes = Object.values(s.data.nodes);

            // Nodes with a dependency (e.g. an attached subworkflow) derive their shape from
            // that dependency, not a static blueprint, so they can't be blindly recreated — skip them.
            const recreatable = nodes.filter(n => !n.dependencyRef);

            // Hydrate each distinct blueprint once (parallel), so we recreate from fresh blueprints.
            const blueprintIds = [...new Set(recreatable.map(n => n.blueprintId))];
            await Promise.all(blueprintIds.map(id => ShelfSDK.actions.hydrateBlueprint(id)));

            const blueprints = ShelfSDK.state.blueprints;

            // Run every recreate in a single commit + cycles recompute → one undo step.
            setDocument(withCyclesRecompute(d => {
                for (const node of recreatable) {
                    const blueprint = blueprints[node.blueprintId];
                    if (!blueprint) {
                        console.error(`Skipping recreate for ${node.id}: blueprint ${node.blueprintId} failed to hydrate`);
                        continue;
                    }
                    reducers.node.recreate(d, node.id, blueprint, resolveCredentialDefaults(blueprint));
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
                    ? sdk.document.data.dependencies.published
                    : sdk.document.data.dependencies.draft;

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

            setDocument(d => { 
                nodeId = reducers.node.create(d, props[0], props[1], props[2], credentials) 
            })
}),
        attachDependency: withAsyncCommit(async (nodeId, workflowId, mode) => {
            // Reuse the snapshot when the workflow already embeds this dependency.
            const existing = sdk.selectors.dependency.get(sdk.document, workflowId, mode)

            if (existing) {
                setDocument(withCyclesRecompute(d => {
                    reducers.node.attachDependency(d, nodeId, mode, existing)
                }))
                return true
            }

            const promise = createToastPromise<{ dependency: Workflow.Dependency }>(
                mode === "publication"
                    ? Workbench.API.Dependency.Published.load(api, { dependencyId: workflowId })
                    : Workbench.API.Dependency.Draft.load(api, { dependencyId: workflowId }),
                {
                    loading: "Loading workflow…",
                    success: "Workflow attached",
                    error:   (err: unknown) => `Failed to attach dependency: ${SystemError.fromUnknown(err).message}`,
                }
            )

            try {
                const { dependency } = await promise

                setDocument(withCyclesRecompute(d => {
                    reducers.node.attachDependency(d, nodeId, mode, dependency)
                }))
            } catch (err) {
                console.error("Failed to attach dependency", err)
                return false
            }

            return true
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
    attachDependency    : (nodeId: Workflow.Node.Id, workflowId: Workflow.Id, mode: "publication" | "draft") => Promise<boolean>;
};
