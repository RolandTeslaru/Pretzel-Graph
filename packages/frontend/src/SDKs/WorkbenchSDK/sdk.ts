import { create } from "zustand"
import { immer } from "zustand/middleware/immer";
import type { OnSelectionChangeParams, Edge as RF_Edge, Node as RF_Node, ReactFlowInstance } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { _createWorkbenchActions_, type _WorkbenchSDKActions } from "./actions";
import { workbenchSelectors, type _WorkBenchSDKSelectors } from "./selectors";
import React from "react";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain"
import { temporal } from 'zundo';
import { cloneDeep } from "lodash";
import { isConnectionValid } from "./utils";
import { BaseSDK } from "../Base";
import { useShallow } from "zustand/react/shallow";
import { SDK } from "../SDKManager";
import { toast } from "sonner";
import { supabase } from "@/libs/supabase";
import { workbenchReducers } from "./reducers";

@SDK("Workbench")
export class WorkbenchSDKImpl extends BaseSDK<WorkbenchSDK.State> {

    constructor() { super() }

    private readonly TEMPORAL_STACK_SIZE = 1

    // Mutatable non reactive state
    public readonly runtime = {
        isReconnectionSuccessful: true,
        canvasDriver: null as ReactFlowInstance<WorkbenchSDK.NodeDriver, WorkbenchSDK.EdgeDriver> | null,
        lastMousePosition: { x: 0, y: 0 }
    }

    public readonly useStore: BaseSDK.Store<WorkbenchSDK.State> = create(
        temporal(
            immer<WorkbenchSDK.State>(() => ({
                workflow: cloneDeep(Workflow.INITIAL),
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
                },
                clipboard: {
                    nodes: new Set(),
                    edges: new Set(),
                    layout: {},
                }
            })), {
            limit: this.TEMPORAL_STACK_SIZE,
            partialize: (s) => ({
                isDirty: true,
                workflow: s.workflow,
            })
        }
        )
    )

    public readonly selectors: WorkbenchSDK.Selectors = workbenchSelectors;
    public readonly reducers: WorkbenchSDK.Reducers = workbenchReducers;
    public readonly actions: WorkbenchSDK.Actions = _createWorkbenchActions_(this)


    public get isLocked(): boolean {
        const workflow = this.state.workflow;
        return workflow.locked;
    }


    public useStaticValue(nodeId: Workflow.Node.Id, fieldOrInput: Foundations.Field | Foundations.Port.Input) {
        const value = this.useStore(useShallow(s => {
            const val = s.workflow.data.staticValues[nodeId]?.[fieldOrInput.id];
            if (val == null)
                // @ts-expect-error
                return fieldOrInput.initialValue;
            return val
        }))
        return value;
    }


    public readonly canvasWrapper = React.createRef<HTMLDivElement>();


    public async loadWorkflow(workflowId: Workflow.Id) {
        try {
            const { workflow } = await Workflow.API.get(supabase, { workflowId })
            if (!workflow) {
                throw new Error("Workflow not found")
            }
            Workflow.Schema.parse(workflow);
            this.actions.workflow.open(workflow)
        } catch (error) {
            console.error(error)
            toast.error("Failed to parse workflow")
            throw error
        }
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
            const node = wf.data.nodes[edge.source.nodeId]

            const output = node.outputs.find((o: Foundations.Port.Output) => o.id === edge.source.portId);

            if (!output)
                return

            edgeDrivers.push({
                id: edge.id,
                type: "workflowEdge",
                source: edge.source.nodeId,
                sourceHandle: edge.source.portId,
                target: edge.target.nodeId,
                targetHandle: edge.target.portId,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: `var(--port-${output.variant})`,
                    width: 15,
                    height: 15
                }
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
        lastSelection: OnSelectionChangeParams<NodeDriver, EdgeDriver> | null;
        clickedNodeId: Workflow.Node.Id | null;
        draggedHandle: Handle | null
        clipboard: {
            nodes: Set<Workflow.Node>
            edges: Set<Workflow.Edge>,
            layout: Record<Workflow.Node.Id, { x: number, y: number }>
        }
        cache: {
            ingoersEdgesMap: Record<Workflow.Node.Id, Record<Workflow.Node.Id, Workflow.Edge.Id>>,
            outgoersEdgesMap: Record<Workflow.Node.Id, Record<Workflow.Node.Id, Workflow.Edge.Id>>,
            inputHandlesMap: Record<Workflow.Node.Id, Record<Foundations.Port.Input.Id, Workflow.Edge.Id>>
            outputHandlesMap: Record<Workflow.Node.Id, Record<Foundations.Port.Output.Id, Workflow.Edge.Id>>
        }
    }

    export type Handle = {
        nodeId: Workflow.Node.Id,
        field: Foundations.Port.Input | Foundations.Port.Output,
        handleType: "source" | "target"
    }
    // Edges are ui view only
    export namespace Edge {
        export type Id = string;
    }
    export type Selectors = _WorkBenchSDKSelectors
    export type Actions = _WorkbenchSDKActions
    export type Reducers = typeof workbenchReducers

    export type NodeDriver = RF_Node<{}, "workflowNode">;
    export type EdgeDriver = RF_Edge<{}, "workflowEdge">;

    export type DriverConnection = {
        source: Workflow.Node.Id
        sourceHandle: Foundations.Port.Output.Id
        target: Workflow.Node.Id
        targetHandle: Foundations.Port.Input.Id
    }
}