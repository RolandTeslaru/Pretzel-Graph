import { createWithEqualityFn } from "zustand/traditional"
import { shallow } from "zustand/shallow"
import { immer } from "zustand/middleware/immer";
import type { OnSelectionChangeParams, Edge as RF_Edge, Node as RF_Node, ReactFlowInstance } from "@xyflow/react";
import { _createWorkbenchActions_, type _WorkbenchSDKActions } from "./actions";
import { workbenchSelectors, type _WorkBenchSDKSelectors } from "./selectors";
import React from "react";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain"
import { temporal } from 'zundo';
import { cloneDeep } from "lodash";
import { isConnectionValid } from "./utils/connectionValidation";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { toast } from "sonner";
import { supabase } from "@/libs/supabase";
import { workbenchReducers } from "./reducers";
import { createDrivers } from "./utils/createDrivers";

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

    public readonly useStore: BaseSDK.Store<WorkbenchSDK.State> = createWithEqualityFn(
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
                issues: {},
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
        ),
        shallow
    )

    public readonly selectors: WorkbenchSDK.Selectors = workbenchSelectors;
    public readonly reducers: WorkbenchSDK.Reducers = workbenchReducers;
    public readonly actions: WorkbenchSDK.Actions = _createWorkbenchActions_(this)


    public get isLocked(): boolean {
        const workflow = this.state.workflow;
        return workflow.locked;
    }

    public useField(nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) {
        return this.useStore(s => {
            const staticVals = s.workflow.data.staticValues[nodeId]
            if(!staticVals)
                return [null, null] as const
            const value = staticVals[fieldId] as any
            return [
                value,
                s.issues[nodeId]?.fields[fieldId] ?? null
            ] as const
        });
    }

    public useInput(nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) {
        return this.useStore(s => {
            const staticVals = s.workflow.data.staticValues[nodeId]
            if(!staticVals)
                return [null, null] as const
            const value = staticVals[inputId] as any
            return [
                value,
                s.issues[nodeId]?.inputs[inputId] ?? null
            ] as const
        });
    }


    public readonly canvasWrapper = React.createRef<HTMLDivElement>();


    public async loadWorkflow(workflowId: Workflow.Id) {
        try {
            const { workflow } = await Workflow.API.get(supabase, { workflowId })
            if (!workflow)
                throw new Error("Workflow not found")

            Workflow.Schema.parse(workflow);
            this.actions.workflow.open(workflow)
        } catch (error) {
            console.error(error)
            toast.error("Failed to parse workflow")
            throw error
        }
    }

    public isConnectionValid = isConnectionValid;

    public readonly createDrivers = createDrivers
}





export const WorkbenchSDK = SDK.get<WorkbenchSDKImpl>("Workbench")





export namespace WorkbenchSDK {
    export interface State {
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
        cache: Workflow.Cache
        issues: Record<Workflow.Node.Id, {
            fields: Record<Foundations.Field.Id, Workflow.Issue.Field>;
            inputs: Record<Foundations.Port.Input.Id, Workflow.Issue.Input>;
        }>
    }

    export interface Handle {
        nodeId: Workflow.Node.Id,
        field: Foundations.Port.Input | Foundations.Port.Output,
        handleType: "source" | "target"
    }

    export type Selectors = _WorkBenchSDKSelectors
    export type Actions = _WorkbenchSDKActions
    export type Reducers = typeof workbenchReducers

    export type NodeDriver = RF_Node<{}, "workflowNode">;
    export type EdgeDriver = RF_Edge<{}, "workflowEdge">;

    export interface DriverConnection {
        source: Workflow.Node.Id
        sourceHandle: Foundations.Port.Output.Id
        target: Workflow.Node.Id
        targetHandle: Foundations.Port.Input.Id
    }
}