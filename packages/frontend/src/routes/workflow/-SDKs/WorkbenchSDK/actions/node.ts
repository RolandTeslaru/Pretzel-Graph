import type { DropFirstArg } from "@/SDKs/types";
import { type WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withAsyncCommit, withCommit, withCyclesRecompute } from "../utils/actions"
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { Foundations, SystemError, Workbench, type Workflow } from "@pretzel-graph/shared/domain";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { toast } from "sonner";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { extractExposedPorts } from "@pretzel-graph/shared/subworkflow";

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
        setCredential:     withCommit((...props) => setState(s => { reducers.node.setCredential(s, ...props) })),
        
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
            
            
            setState(withCyclesRecompute(s => { reducers.node.recreate(s, nodeId, blueprint)}));
        }),
        create:        withAsyncCommit( async (...props) => { 
            const blueprint = props[0];

            let nodeId: Workflow.Node.Id | null = null;
            
            // Handle nodes that are actually subworkflows;
            let fetchDepPromise: Promise<Workbench.API.Dependency.Published.Load.Response> | null = null;

            if(blueprint.workflowDependencyId){
                if(!sdk.state.data.dependencies.published[blueprint.workflowDependencyId]){
                    fetchDepPromise = Workbench.API.Dependency.Published.load(api, { dependencyId: blueprint.workflowDependencyId});

                    fetchDepPromise.then(({ dependency }) => {
                        sdk.actions.dependency.registerDependency(dependency);
                    })
                    // Catch and cleanup
                    fetchDepPromise.catch(err => {
                        const error = SystemError.fromUnknown(err)
                        console.error("Failed to load dependency for node", error)
                        toast.error(`Failed to load dependency for node: ${error.message}`)

                        if(nodeId)
                            sdk.actions.node.remove(nodeId)
                    })
                }
            }

            setState(s => { 
                nodeId = reducers.node.create(s,...props) 
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
    setCredential       : DropFirstArg<WorkbenchSDK.Reducers['node']['setCredential']>;
};
