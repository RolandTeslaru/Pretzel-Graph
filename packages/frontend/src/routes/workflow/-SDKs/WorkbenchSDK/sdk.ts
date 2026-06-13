import { createWithEqualityFn } from "zustand/traditional"
import { shallow } from "zustand/shallow"
import { immer } from "zustand/middleware/immer";
import type { OnSelectionChangeParams, Edge as RF_Edge, Node as RF_Node, ReactFlowInstance } from "@xyflow/react";
import { _createWorkbenchActions_, type _WorkbenchSDKActions } from "./actions";
import { workbenchSelectors, type WorkbenchSDKSelectors } from "./selectors";
import { useState, useRef, useMemo, useEffect, useCallback, createRef } from "react";
import { Foundations, Validation, Workflow, Workbench } from "@pretzel-graph/shared/domain"
import { temporal } from 'zundo';
import { cloneDeep, debounce as lodashDebounce } from "lodash";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { workbenchReducers } from "./reducers";
import { createDrivers } from "./utils/createDrivers";

@SDK("Workbench")
export class WorkbenchSDKImpl extends BaseSDK<WorkbenchSDK.State> {

    constructor() { super() }

    private readonly TEMPORAL_STACK_SIZE = 3

    // Mutatable non reactive state
    public readonly runtime = {
        isReconnectionSuccessful: true,
        canvasDriver: null as ReactFlowInstance<WorkbenchSDK.NodeDriver | WorkbenchSDK.CycleSelectionNodeDriver, WorkbenchSDK.EdgeDriver> | null,
        lastMousePosition: { x: 0, y: 0 }
    }

    public readonly useStore: BaseSDK.Store<WorkbenchSDK.State> = createWithEqualityFn(
        temporal(
            immer<WorkbenchSDK.State>(() => ({
                workflowId: '' as Workflow.Id,
                data: cloneDeep(Workflow.INITIAL.data),
                isDirty: false,
                isDraggingNode: false,
                lastSelection: null,
                clickedNodeId: null,
                selectionContextMenu: null,
                paneContextMenu: null,
                draggedHandle: null,
                cache: cloneDeep(Workflow.Cache.INITIAL),
                issues: {
                    nodes: {},
                    cycles: []
                },
                cycles: [],
                cyclesDirty: false,
                reconcilingFields: {},
                stronglyConnectedComponents: [],
                clipboard: {
                    nodes: new Set(),
                    edges: new Set(),
                    layout: {},
                },
                dependencyUpdates: { published: {}, draft: {} },
                selectors: workbenchSelectors
            })), {
            limit: this.TEMPORAL_STACK_SIZE,
            partialize: (s) => ({
                isDirty: true,
                workflowId: s.workflowId,
                data: s.data,
                cyclesDirty: s.cyclesDirty,
            })
        }
        ),
        shallow
    )

    public readonly selectors: WorkbenchSDK.Selectors = workbenchSelectors;
    public readonly reducers: WorkbenchSDK.Reducers = workbenchReducers;
    public readonly actions: WorkbenchSDK.Actions = _createWorkbenchActions_(this)


    public get isLocked(): boolean {
        return LibrarySDK.state.workflowMetas[this.state.workflowId]?.locked ?? false;
    }

    public useField<T>(nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) {
        return this.useStore(s => {
            const staticVals = s.data.staticValues[nodeId]
            if (!staticVals)
                return [undefined, null, false] as const

            const isReconciling = s.reconcilingFields[nodeId]?.has(fieldId) ?? false

            const value = staticVals[fieldId] as T
            return [
                value,
                s.issues.nodes[nodeId]?.fields[fieldId] ?? null,
                isReconciling
            ] as const
        });
    }

    public useDebouncedField<T>(nodeId: Workflow.Node.Id, field: Foundations.Field, delay = 300) {
        const [storeValue, issue, isReconciling] = this.useField<T>(nodeId, field.id);
        const [localValue, setLocalValue] = useState<T>(storeValue as T);
        const isPending = useRef(false);

        const debouncedSetValue = useMemo(
            () => lodashDebounce((val: T) => {
                this.actions.field.setValue(nodeId, field, val);
                isPending.current = false;
            }, delay),
            // field.id is the stable identity; field object reference changes on every render
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [nodeId, field.id, delay]
        );

        useEffect(() => {
            if (!isPending.current) setLocalValue(storeValue as T);
        }, [storeValue]);

        useEffect(() => () => { debouncedSetValue.cancel() }, [debouncedSetValue]);

        const onChange = useCallback((val: T) => {
            isPending.current = true;
            setLocalValue(val);
            debouncedSetValue(val);
        }, [debouncedSetValue]);

        const flush = useCallback(() => {
            debouncedSetValue.flush();
        }, [debouncedSetValue]);

        return [localValue, onChange, flush, issue, isReconciling] as const;
    }

    public useDebouncedInput<T>(nodeId: Workflow.Node.Id, input: Foundations.Port.Input, delay = 300) {
        const [storeValue, issue] = this.useInput(nodeId, input.id);
        const [localValue, setLocalValue] = useState<T>(storeValue as T);
        const isPending = useRef(false);

        const debouncedSetValue = useMemo(
            () => lodashDebounce((val: T) => {
                this.actions.input.setValue(nodeId, input, val);
                isPending.current = false;
            }, delay),
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [nodeId, input.id, delay]
        );

        useEffect(() => {
            if (!isPending.current) setLocalValue(storeValue as T);
        }, [storeValue]);

        useEffect(() => () => { debouncedSetValue.cancel() }, [debouncedSetValue]);

        const onChange = useCallback((val: T) => {
            isPending.current = true;
            setLocalValue(val);
            debouncedSetValue(val);
        }, [debouncedSetValue]);

        const flush = useCallback(() => {
            debouncedSetValue.flush();
        }, [debouncedSetValue]);

        return [localValue, onChange, flush, issue] as const;
    }

    public useInput(nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) {
        return this.useStore(s => {
            const staticVals = s.data.staticValues[nodeId]
            if (!staticVals)
                return [null, null] as const
            const value = staticVals[inputId] as any
            return [
                value,
                s.issues.nodes[nodeId]?.inputs[inputId] ?? null
            ] as const
        });
    }


    public openWorkflowWindow(workflowId: Workflow.Id): void {
        window.open(`/workflow/${workflowId}`, "_blank");
    }

    public readonly canvasWrapper = createRef<HTMLDivElement>();

    public readonly createDrivers = createDrivers
}





export const WorkbenchSDK = SDK.get<WorkbenchSDKImpl>("Workbench")





export namespace WorkbenchSDK {
    export interface State {
        workflowId: Workflow.Id;
        data: Workflow.Data;
        isDirty: boolean;
        isDraggingNode: boolean;
        lastSelection: OnSelectionChangeParams<NodeDriver, EdgeDriver> | null;
        clickedNodeId: Workflow.Node.Id | null;
        selectionContextMenu: { x: number, y: number } | null;
        paneContextMenu: { x: number, y: number } | null;
        draggedHandle: Handle | null
        reconcilingFields: Record<Workflow.Node.Id, Set<Foundations.Field.Id>>
        clipboard: {
            nodes: Set<Workflow.Node>
            edges: Set<Workflow.Edge>,
            layout: Record<Workflow.Node.Id, { x: number, y: number }>
        }
        cache: Workflow.Cache
        cyclesDirty: boolean
        issues: Validation.Issue.Workflow_
        cycles: Workflow.Node.Id[][]
        stronglyConnectedComponents: Array<Set<Workflow.Node.Id>>,
        dependencyUpdates: {
            published: Record<Workflow.Id, Workflow.Dependency.Publication.UpdateInfo>
            draft:     Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo>
        }
        selectors: WorkbenchSDKSelectors
    }

    export interface Handle {
        nodeId: Workflow.Node.Id,
        field: Foundations.Port.Input | Foundations.Port.Output,
        handleType: "source" | "target"
    }

    export type Selectors = WorkbenchSDKSelectors
    export type Actions = _WorkbenchSDKActions
    export type Reducers = typeof workbenchReducers

    export type NodeDriver = RF_Node<{}, "workflowNode">;
    export type EdgeDriver = RF_Edge<{}, "workflowEdge">;
    export type CycleSelectionNodeDriver = RF_Node<{ width: number, height: number, nodeIds: Workflow.Node.Id[], issue: Validation.Issue.Cycle }, "cycleSelectionNode">;

    export interface DriverConnection {
        source: Workflow.Node.Id
        sourceHandle: Foundations.Port.Output.Id
        target: Workflow.Node.Id
        targetHandle: Foundations.Port.Input.Id
    }
}
