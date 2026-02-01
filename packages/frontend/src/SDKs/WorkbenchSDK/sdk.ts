import { create } from "zustand"
import { immer } from "zustand/middleware/immer";
import type { OnSelectionChangeParams, Edge as RF_Edge, Node as RF_Node, ReactFlowInstance, ReactFlowJsonObject } from "@xyflow/react";
import { _createWorkbenchActions_, _WorkbenchSDKActions } from "./actions";
import { _createWorkbenchReducers_, _WorkbenchSDKReducers } from "./reducers";
import { _createWorkbenchSelectors_, _WorkBenchSDKSelectors } from "./selectors";
import React from "react";
import { Workflow } from "@vx-agent-builder/shared/types"
import { temporal } from 'zundo';
import { cloneDeep } from "lodash";
import { LibrarySDK } from "../LibrarySDK/sdk";
import { fetchFlow } from "@/controllers/API/queries/flows/use-get-flow";
import { SanitizationLayer } from "@/SanitizationLayer";
import { Flow } from "@/types/flow";
import { isConnectionValid } from "./utils";
import { BaseSDK } from "../Base";
import { useShallow } from "zustand/react/shallow";
import { SDK } from "../SDKManager";
import { EMPTY_WORKFLOW } from "../VaultSDK/defaults";

@SDK("Workbench")
export class WorkbenchSDKImpl extends BaseSDK<WorkbenchSDK.State> {
    
    constructor() { super() }

    private readonly TEMPORAL_STACK_SIZE = 10

    public readonly runtime = {
        isReconnectionSuccessful: true,
        canvasDriver: null as ReactFlowInstance<WorkbenchSDK.NodeDriver, WorkbenchSDK.EdgeDriver> | null
    }

    public readonly useStore: BaseSDK.Store<WorkbenchSDK.State> = create(
        temporal(
            immer<WorkbenchSDK.State>(() => ({
                workflow: cloneDeep(EMPTY_WORKFLOW),
                isDirty: false,
                isDraggingNode: false,
                lastSelection: null,
                clickedNodeId: null,
                draggedHandle: null,
                cache: {
                    ingoersEdgesMap: {},
                    outgoersEdgesMap: {},
                    inputHandlesMap: {},
                    outputHandlesMap: {},
                }
            })), {
            limit: this.TEMPORAL_STACK_SIZE,
            partialize: (s) => ({
                isDirty: true,
                workflow: s.workflow,
                cache: s.cache
            })
        }
        )
    )

    public readonly selectors: WorkbenchSDK.Selectors = _createWorkbenchSelectors_()
    public readonly reducers: WorkbenchSDK.Reducers = _createWorkbenchReducers_(this.selectors)
    public readonly actions: WorkbenchSDK.Actions = _createWorkbenchActions_(this)


    public get isLocked(): boolean {
        const workflow = this.state.workflow;
        return workflow.locked;
    }


    public useInputValue(nodeId: Workflow.Node.Id, input: Workflow.Node.Input) {
        const value = this.useStore(useShallow(s => {
            const val = s.workflow.data.fieldValues[nodeId]?.[input.id];
            if (!val)
                return input.initialValue;
            return val
        }))
        return value;
    }


    public readonly canvasWrapper = React.createRef<HTMLDivElement>();


    public async openWorkflow(id: Workflow.Id) {
        LibrarySDK.useStore.setState({ currentWorkflowId: id });

        const lfFlow: Flow.Data = await fetchFlow({ id });
        const workflow = SanitizationLayer.sanitizeFlowAPIResponse(lfFlow);
        const cache = this.reducers.createCache(workflow);

        this.setState({ workflow, cache, isDirty: false });
    }

    public isConnectionValid = isConnectionValid;

    public createDrivers(wf: Workflow) {
        const nodeDrivers = [] as WorkbenchSDK.NodeDriver[]
        const edgeDrivers = [] as WorkbenchSDK.EdgeDriver[]

        Object.values(wf.data.nodes).forEach(node => {
            nodeDrivers.push({
                id: node.id,
                type: "workflowNode",
                position: wf.data.ui.layout[node.id] ?? { x: 0, y: 0 },
                data: {},
            })
        })

        Object.values(wf.data.edges).forEach(edge => {
            edgeDrivers.push({
                id: edge.id,
                type: "workflowEdge",
                source: edge.source.nodeId,
                sourceHandle: edge.source.handleId,
                target: edge.target.nodeId,
                targetHandle: edge.target.handleId,
            })
        })

        return { nodeDrivers, edgeDrivers }
    }
}





export const WorkbenchSDK = SDK.get<WorkbenchSDKImpl>("Workbench")





export namespace WorkbenchSDK {

    export type State = {
        workflow: Workflow;
        isDirty: boolean;
        isDraggingNode: boolean;
        lastSelection: OnSelectionChangeParams | null;
        clickedNodeId: Workflow.Node.Id | null;
        draggedHandle: Handle | null
        cache: {
            ingoersEdgesMap: Record<Workflow.Node.Id, Record<Workflow.Node.Id, Workflow.Edge.Id>>,
            outgoersEdgesMap: Record<Workflow.Node.Id, Record<Workflow.Node.Id, Workflow.Edge.Id>>,
            inputHandlesMap: Record<Workflow.Node.Id, Record<Workflow.Node.Input.Id, Workflow.Edge.Id>>
            outputHandlesMap: Record<Workflow.Node.Id, Record<Workflow.Node.Output.Id, Workflow.Edge.Id>>
        }
    }

    export type Handle = {
        nodeId: Workflow.Node.Id,
        field: Workflow.Node.Input | Workflow.Node.Output,
        handleType: "source" | "target"
    }
    // Edges are ui view only
    export namespace Edge {
        export type Id = string;
    }
    export type Selectors = _WorkBenchSDKSelectors
    export type Actions = _WorkbenchSDKActions
    export type Reducers = _WorkbenchSDKReducers

    export type NodeDriver = RF_Node<{}, "workflowNode">;
    export type EdgeDriver = RF_Edge<{}, "workflowEdge">;

    export type DriverConn = {
        source: Workflow.Node.Id
        sourceHandle: Workflow.Node.Output.Id
        target: Workflow.Node.Id
        targetHandle: Workflow.Node.Input.Id
    }
}