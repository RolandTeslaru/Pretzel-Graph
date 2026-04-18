import type { DropFirstArg } from "@/SDKs/types";
import { type WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withAsyncCommit, withCommit, withCyclesRecompute } from "../utils/actions"
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { Foundations, Workbench, type Workflow } from "@vx-agent-editor/shared/domain";
import type { Field } from "@vx-agent-editor/shared/domain/Foundations/Field";
import { toast } from "sonner";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { extractExposedPorts } from "@vx-agent-editor/shared/subworkflow";

export function createNodeActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        remove:            withCommit((...props) => setState(withCyclesRecompute(s => { reducers.node.remove(s,            ...props) }))),
        create:            withCommit((...props) => setState(s => { reducers.node.create(s,            ...props) })),
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
            const node = s.workflow.data.nodes[nodeId];
            const blueprintId = node.blueprintId;
            
            const blueprint = ShelfSDK.state.blueprints[node.blueprintId];
            
            if(blueprintId === "Core.SubWorkflow.Execute") {
                const workflowId = s.workflow.data.staticValues[nodeId]["workflowId" as Field.Id] as Workflow.Id | undefined; 
                if(!workflowId) {
                    toast.error("Cannot recreate node: missing workflowId static value");
                    return;
                }
                const { workflow: subWorkflow } = await Workbench.API.Workflow.get(api, { workflowId })

                const exposedPortsBlueprint = {
                    ...blueprint,
                    ...extractExposedPorts(subWorkflow),
                } satisfies Foundations.Blueprint;
                setState(withCyclesRecompute(s => { reducers.node.recreate(s, nodeId, exposedPortsBlueprint)}));
                return;
            }


            setState(withCyclesRecompute(s => { reducers.node.recreate(s, nodeId, blueprint)}));
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
};
