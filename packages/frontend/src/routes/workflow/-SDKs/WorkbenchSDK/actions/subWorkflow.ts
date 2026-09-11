import type { WorkbenchSDKImpl } from "../sdk"
import { withAsyncCommit, withCyclesRecompute } from "../utils/actions"
import { toast } from "sonner";
import { ShelfSDK } from "../../ShelfSDK/sdk";
import { Foundations, Library, Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { cloneDeep } from 'lodash';
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { api } from "@/SDKs/ApiInterceptorSDK";

export function createSubWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;
    const sel = sdk.selectors;

    return {
        /**
         * Extracts a selection out of the currently-open workflow (the "master") into a new
         * standalone workflow, and leaves a single Execute node behind in its place.
         *
         * 1. Start from a blank `Workflow.INITIAL` in the folder the caller chose.
         * 2. Copy each selected node across, along with everything stored *beside* the node in
         *    `data` and keyed by node id — `staticValues` and `fieldExpressions`. Layout is
         *    re-centred on the selection's centroid so the subflow opens framed rather than
         *    wherever the nodes happened to sit.
         * 3. Copy only edges with both endpoints inside the selection; edges crossing the boundary
         *    are dropped here and become the subflow's exposed ports instead.
         * 4. POST the subflow — it must exist server-side before step 5 can reference its id.
         * 5. Delete the extracted nodes/edges from the master, drop in one Execute node, and
         *    attach the new workflow to it as a draft dependency, which gives it its ports.
         *
         * Steps 4 and 5 are deliberately ordered: the Execute node's `workflowId` field is the
         * id the server hands back, so a failed create aborts before the master is touched.
         */
        create: withAsyncCommit(async (nodeIds: Workflow.Node.Id[], edgeIds: Workflow.Edge.Id[], displayName: string, folderId: Library.Folder.Id) => {
            if (nodeIds.length === 0) {
                toast.error("No nodes selected to create sub-workflow");
                return;
            }

            const blueprint = ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]
            if (!blueprint) {
                toast.error("ExecuteSubWorkflow blueprint not loaded — open the node shelf first");
                return;
            }
            
            const state = sdk.document;
            const masterData = state.data;
            const selectedNodeIds = new Set(nodeIds);

            const hasInvalidSelection = nodeIds.some(nodeId => {
                const node = sel.node.get(state, nodeId);
                const nodePos = masterData.ui.layout[nodeId];
                return !node || !nodePos;
            });

            if (hasInvalidSelection) {
                toast.error("Selection is stale. Please reselect nodes and try again");
                return;
            }

            const subflow = cloneDeep(Workflow.INITIAL) as Workflow;

            // The server assigns the real id; this one only has to be well-formed for the request.
            subflow.id           = Workflow.createId();
            subflow.display_name = displayName;
            subflow.folder_id = folderId;

            const groupNodePos = { x: 0, y: 0 };
            const offsetPos = { x: 0, y: 0 };

            nodeIds.forEach(nodeId => {
                const nodePos = masterData.ui.layout[nodeId];
                offsetPos.x += nodePos.x;
                offsetPos.y += nodePos.y;
            })

            offsetPos.x /= nodeIds.length;
            offsetPos.y /= nodeIds.length;

            nodeIds.forEach(nodeId => {
                const node = sel.node.get(state, nodeId);
                subflow.data.nodes[nodeId] = node;

                subflow.data.staticValues[nodeId] = masterData.staticValues[nodeId];
                subflow.data.fieldExpressions[nodeId] = masterData.fieldExpressions[nodeId] ?? {};
                const nodeOriginalPos = masterData.ui.layout[nodeId];

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
                const edge = state.cache.edges[edgeId];
                if (!edge)
                    return;

                const hasSourceNode = selectedNodeIds.has(edge.source.nodeId);
                const hasTargetNode = selectedNodeIds.has(edge.target.nodeId);

                if (hasSourceNode && hasTargetNode)
                    subflow.data.edges.push(edgeId);
            })

            let workflowId: Workflow.Id | Foundations.Field.Id;
            let newNodeId: Workflow.Node.Id

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

            setDocument(withCyclesRecompute(d => {
                nodeIds.forEach(nodeId => {
                    if (d.data.nodes[nodeId])
                        reducers.node.remove(d, nodeId)
                })

                edgeIds.forEach(edgeId => {
                    if (d.cache.edges[edgeId])
                        reducers.edge.remove(d, edgeId)
                })

                newNodeId = reducers.node.create(d, blueprint, groupNodePos)
            }))

            // The node is in place either way; a failed attach leaves it unresolved, which the
            // toast from attachToNode already reports.
            await sdk.actions.dependency.attachToNode(newNodeId!, workflowId, "draft")

        })
    } satisfies SubWorkflowActions;
}

export type SubWorkflowActions = {
    create: (nodeIds: Workflow.Node.Id[], edgeIds: Workflow.Edge.Id[], displayName: string, folderId: Library.Folder.Id) => Promise<void>;
}