import type { WorkbenchSDKImpl } from "../sdk"
import { withAsyncCommit, withCyclesRecompute } from "../utils/actions"
import { toast } from "sonner";
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { Foundations, Workbench, Workflow } from "@vx-agent-editor/shared/domain";
import { extractExposedPorts } from "@vx-agent-editor/shared/subworkflow";
import { cloneDeep } from 'lodash';
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { api } from "@/SDKs/ApiInterceptorSDK";

export function createSubWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel = sdk.selectors;

    return {
        create: withAsyncCommit(async (nodeIds: Workflow.Node.Id[], edgeIds: Workflow.Edge.Id[], displayName: string) => {
            if (nodeIds.length === 0) {
                toast.error("No nodes selected to create sub-workflow");
                return;
            }

            const blueprint = ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]
            if (!blueprint) {
                toast.error("ExecuteSubWorkflow blueprint not loaded — open the node shelf first");
                return;
            }
            
            const state = sdk.state;
            const masterWorkflow = state.workflow;
            const selectedNodeIds = new Set(nodeIds);

            const hasInvalidSelection = nodeIds.some(nodeId => {
                const node = sel.node.get(state, nodeId);
                const nodePos = masterWorkflow.data.ui.layout[nodeId];
                return !node || !nodePos;
            });

            if (hasInvalidSelection) {
                toast.error("Selection is stale. Please reselect nodes and try again");
                return;
            }

            const subflow = cloneDeep(Workflow.INITIAL) as Workflow;

            subflow.display_name = displayName;
            subflow.folder_id = masterWorkflow.folder_id;

            const groupNodePos = { x: 0, y: 0 };
            const offsetPos = { x: 0, y: 0 };

            nodeIds.forEach(nodeId => {
                const nodePos = masterWorkflow.data.ui.layout[nodeId];
                offsetPos.x += nodePos.x;
                offsetPos.y += nodePos.y;
            })

            offsetPos.x /= nodeIds.length;
            offsetPos.y /= nodeIds.length;

            nodeIds.forEach(nodeId => {
                const node = sel.node.get(state, nodeId);
                subflow.data.nodes[nodeId] = node;

                subflow.data.staticValues[nodeId] = masterWorkflow.data.staticValues[nodeId];
                const nodeOriginalPos = masterWorkflow.data.ui.layout[nodeId];

                const pos = { x: 0, y: 0 };
                subflow.data.ui.layout[nodeId] = pos;

                pos.x = nodeOriginalPos.x - offsetPos.x;
                pos.y = nodeOriginalPos.y - offsetPos.y;

                groupNodePos.x += nodeOriginalPos.x;
                groupNodePos.y += nodeOriginalPos.y;
            })

            groupNodePos.x /= nodeIds.length;
            groupNodePos.y /= nodeIds.length;


            edgeIds.forEach(edgeId => {
                const edge = state.workflow.data.edges[edgeId];
                if (!edge)
                    return;

                const hasSourceNode = selectedNodeIds.has(edge.source.nodeId);
                const hasTargetNode = selectedNodeIds.has(edge.target.nodeId);

                if (hasSourceNode && hasTargetNode)
                    subflow.data.edges[edgeId] = edge;
            })

            let workflowId: Workflow.Id | Foundations.Field.Id;

            try {
                const response = await Workbench.API.Workflow.create(api, { workflow: subflow });
                workflowId = response.workflow_id;

                LibrarySDK.actions.workflow.upsertMeta({
                    ...subflow,
                    id: response.workflow_id,
                });

            } catch (error) {
                console.error(error);
                toast.error("Could not create sub-workflow");
                throw error;
            }

            setState(withCyclesRecompute(s => {
                nodeIds.forEach(nodeId => {
                    if (s.workflow.data.nodes[nodeId])
                        reducers.node.remove(s, nodeId)
                })

                edgeIds.forEach(edgeId => {
                    if (s.workflow.data.edges[edgeId])
                        reducers.edge.remove(s, edgeId)
                })

                const exposedSubWorkflowBlueprint = {
                    ...blueprint,
                    ...extractExposedPorts(subflow),
                }

                reducers.node.create(
                    s, exposedSubWorkflowBlueprint, groupNodePos,
                    { ["workflowId" as Foundations.Field.Id]: workflowId }
                )
            }))
        })
    } satisfies SubWorkflowActions;
}

export type SubWorkflowActions = {
    create: (nodeIds: Workflow.Node.Id[], edgeIds: Workflow.Edge.Id[], displayName: string) => Promise<void>;
}