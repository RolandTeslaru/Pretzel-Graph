import { createWithEqualityFn } from "zustand/traditional"
import { shallow } from "zustand/shallow"
import { immer } from "zustand/middleware/immer";
import type { OnSelectionChangeParams, Edge as RF_Edge, Node as RF_Node, ReactFlowInstance } from "@xyflow/react";
import { _createWorkbenchActions_, type _WorkbenchSDKActions } from "./actions";
import { _createWorkbenchDialogs_, type _WorkbenchSDKDialogs } from "./dialogs";
import { useState, useRef, useEffect, useCallback, useMemo, createRef } from "react";
import { Foundations, Validation, Vault, Workflow, Workbench } from "@pretzel-graph/shared/domain"
import { temporal } from 'zundo';
import { cloneDeep } from "lodash";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { editorReducers } from "./reducers";
import { handleWorkbenchEvent } from "./handle-events";
import { AsyncEventQueueHandler } from "@/SDKs/Realtime/EventQueue";
import { createDrivers, reconcileNodeDrivers, reconcileEdgeDrivers } from "./utils/createDrivers";
import { sameUndoableData } from "./utils/temporal";
import { Document, type NodeUI } from "@pretzel-graph/shared/domain/Workbench/Document";
import type { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

// Stable identities so the port hooks below never return a fresh array to the store subscription.
const EMPTY_INPUTS: Foundations.Port.Input[] = []
const EMPTY_OUTPUTS: Foundations.Port.Output[] = []

@SDK("Workbench")
export class WorkbenchSDKImpl extends BaseSDK<WorkbenchSDK.State> {

    constructor() { super() }

    private readonly TEMPORAL_STACK_SIZE = 5

    // Mutatable non reactive state
    public readonly runtime = {
        isReconnectionSuccessful: true,
        canvasDriver: null as ReactFlowInstance<WorkbenchSDK.NodeDriver | WorkbenchSDK.CycleSelectionNodeDriver, WorkbenchSDK.EdgeDriver> | null,
        lastMousePosition: { x: 0, y: 0 },
        // The open workflow's channel; see handle-events.
        channel: {
            unsubscribe: null as (() => void) | null,
            events:      new AsyncEventQueueHandler<Workbench.Event>(event => handleWorkbenchEvent(this, event)),
        },
    }

    public readonly useDocument: BaseSDK.Store<Document> = createWithEqualityFn(
        temporal(
            immer<Document>(() => ({
                ...Document.create('' as Workflow.Id, cloneDeep(Workflow.INITIAL.data), {}),
                cyclesDirty: false,
            })), {
            limit: this.TEMPORAL_STACK_SIZE,
            partialize: (d) => ({
                isDirty: true,
                workflowId: d.workflowId,
                data: d.data,
                cyclesDirty: d.cyclesDirty,
            }),
            // Skip recording history when only the camera (ui.viewport) or field/input
            // values (staticValues) changed — neither should consume undo slots. Field
            // values are preserved across undo/redo in actions.temporal. Cheap thanks to
            // immer's structural sharing.
            equality: (a, b) =>
                a.workflowId === b.workflowId &&
                a.cyclesDirty === b.cyclesDirty &&
                sameUndoableData(a.data, b.data),
        }
        ),
        shallow
    )

    public readonly useStore: BaseSDK.Store<WorkbenchSDK.State> = createWithEqualityFn(
        immer<WorkbenchSDK.State>(() => ({
            isDraggingNode: false,
            lastSelection: null,
            clickedNodeId: null,
            selectionContextMenu: null,
            paneContextMenu: null,
            draggedPort: null,
        })),
        shallow
    )

    // The document-side twins of BaseSDK's `state` / `subscribe` / `setState`.
    public get document()          { return this.useDocument.getState() }
    public get subscribeDocument() { return this.useDocument.subscribe }
    public get setDocument()       { return this.useDocument.setState }

    public readonly selectors: WorkbenchSDK.Selectors = Document.selectors;
    public readonly reducers: WorkbenchSDK.Reducers = Document.reducers;
    public readonly editorReducers: WorkbenchSDK.EditorReducers = editorReducers;
    public readonly actions: WorkbenchSDK.Actions = _createWorkbenchActions_(this)
    public readonly dialogs: WorkbenchSDK.Dialogs = _createWorkbenchDialogs_()


    public get isLocked(): boolean {
        return LibrarySDK.state.workflowMetas[this.document.workflowId]?.locked ?? false;
    }



    public useNode(nodeId: Workflow.Node.Id | null) {
        const [node, connectedPorts, dependency, resolvedShape, blueprint] = this.useDocument(d => {
            if(!nodeId)
                return [null, {}, null, null, null] as const;

            return [
                d.data.nodes[nodeId],
                d.selectors.node.getConnectedPorts(d, nodeId),
                d.selectors.node.getDependency(d, nodeId),
                d.cache.resolvedShape[nodeId] ?? null,
                d.selectors.blueprint.forNode(d, nodeId),
            ]
        })

        return useMemo(() => {
            if (!node || !blueprint)
                return null;

            return {
                ...node,
                blueprint,
                fields: resolvedShape?.fields ?? [],
                inputs: resolvedShape?.inputs ?? [],
                outputs: resolvedShape?.outputs ?? [],
                ui: {
                    displayName: node.ui?.displayName ?? dependency?.display_name ?? blueprint.ui.displayName,
                    description: node.ui?.description ?? blueprint.ui.description,
                    isMinimized: node.ui?.isMinimized ?? false,
                    isFlipped:   node.ui?.isFlipped   ?? false,
                    icon:        node.ui?.icon        ?? dependency?.icon   ?? blueprint.ui.icon,
                    accent:      node.ui?.accent      ?? dependency?.accent ?? blueprint.ui.accent,
                    iconColor:   node.ui?.iconColor   ?? blueprint.ui.iconColor,
                },
                connectedPorts,
            } as Workflow.Node.Hydrated;
        }, [node, blueprint, resolvedShape, connectedPorts, dependency]);
    }

    /** The clicked node's id, checked against the document so a deleted node cannot stay selected. */
    public useClickedNodeId(): Workflow.Node.Id | null {
        const clickedId = this.useStore(s => s.clickedNodeId);
        return this.useDocument(d => clickedId && d.data.nodes[clickedId] ? clickedId : null);
    }

    public useSelectedNode() {
        return this.useNode(this.useClickedNodeId());
    }


    /** A single resolved output port from the shared node-shape cache. */
    public useOutput(nodeId: Workflow.Node.Id | null, portId: Foundations.Port.Output.Id | null) {
        const [node, outputs] = this.useDocument(d => {
            if (!nodeId)
                return [null, []] as const;
            return [d.data.nodes[nodeId] ?? null, d.cache.resolvedShape[nodeId]?.outputs ?? []] as const;
        });

        return useMemo(() => {
            if (!node || !portId)
                return null;
            return outputs.find(o => o.id === portId) ?? null;
        }, [node, outputs, portId]);
    }


    /** A node's resolved fields from the shared node-shape cache. */
    public useFields(nodeId: Workflow.Node.Id): readonly Foundations.Field[] {
        return this.useDocument(d => d.cache.resolvedShape[nodeId]?.fields ?? []);
    }


    /** A node's resolved input ports from the shared node-shape cache. */
    public useInputs(nodeId: Workflow.Node.Id): Foundations.Port.Input[] {
        return this.useDocument(d => d.cache.resolvedShape[nodeId]?.inputs) ?? EMPTY_INPUTS;
    }


    /** A node's resolved output ports from the shared node-shape cache. */
    public useOutputs(nodeId: Workflow.Node.Id): Foundations.Port.Output[] {
        return this.useDocument(d => d.cache.resolvedShape[nodeId]?.outputs) ?? EMPTY_OUTPUTS;
    }


    /**
     * Buffered field hook. `value` is a local draft that updates instantly via
     * `onChange`; the store is only written on `flush` (wire to `onBlur`) or on
     * unmount. External store changes flow back into the draft while not editing.
     * Controls with no blur (switches/selects) can skip onChange/flush and write
     * directly via `actions.field.setValue` — `value` still tracks the store.
     */
    public useField<T>(nodeId: Workflow.Node.Id, field: Foundations.Field) {
        const fieldId = field.id;

        const initialValue = 'initialValue' in field ? field.initialValue : undefined;

        const [storeValue, issue, isExpression] = this.useDocument(d => [
            d.selectors.node.getStaticValue(d, nodeId, fieldId, initialValue) as T,
            d.selectors.field.getIssue(d, nodeId, fieldId),
            d.selectors.field.usesExpression(d, nodeId, field),
        ] as const);

        const [localValue, setLocalValue] = useState<T>(storeValue as T);
        const localRef = useRef<T>(storeValue as T);
        const isPending = useRef(false);

        // Always commit the latest draft with the latest node/field identity.
        const commitRef = useRef<() => void>(() => {});
        commitRef.current = () => {
            if (!isPending.current) return;
            this.actions.field.setValue(nodeId, field, localRef.current);
            isPending.current = false;
        };

        // Pull external store changes into the draft while not actively editing.
        useEffect(() => {
            if (!isPending.current) {
                setLocalValue(storeValue as T);
                localRef.current = storeValue as T;
            }
        }, [storeValue]);

        const onChange = useCallback((val: T) => {
            isPending.current = true;
            localRef.current = val;
            setLocalValue(val);
        }, []);

        const flush = useCallback(() => { commitRef.current() }, []);

        // Commit any pending draft on unmount (covers the case where onBlur never fires).
        useEffect(() => () => { commitRef.current() }, []);

        return [localValue, onChange, flush, issue, isExpression] as const;
    }

    /**
     * Buffered input hook — same contract as {@link useField} but for port inputs.
     * `value` is a local draft updated via `onChange`; the store is written on
     * `flush` (wire to `onBlur`) or on unmount. External store changes flow back
     * into the draft while not editing.
     */
    public useInput<T>(nodeId: Workflow.Node.Id, input: Foundations.Port.Input) {
        const inputId = input.id;

        const initialValue = 'initialValue' in input ? input.initialValue : undefined;
        
        const [storeValue, issue] = this.useDocument(d => [
            d.selectors.node.getStaticValue(d, nodeId, inputId, initialValue),
            d.selectors.input.getIssue(d, nodeId, inputId)
        ] as const);

        const [localValue, setLocalValue] = useState<T>(storeValue as T);
        const localRef = useRef<T>(storeValue as T);
        const isPending = useRef(false);

        const commitRef = useRef<() => void>(() => {});
        commitRef.current = () => {
            if (!isPending.current) return;
            this.actions.input.setValue(nodeId, input, localRef.current);
            isPending.current = false;
        };

        useEffect(() => {
            if (!isPending.current) {
                setLocalValue(storeValue as T);
                localRef.current = storeValue as T;
            }
        }, [storeValue]);

        const onChange = useCallback((val: T) => {
            isPending.current = true;
            localRef.current = val;
            setLocalValue(val);
        }, []);

        const flush = useCallback(() => { commitRef.current() }, []);

        useEffect(() => () => { commitRef.current() }, []);

        return [localValue, onChange, flush, issue] as const;
    }

    /**
     * Simple credential hook — no local draft. Reads the assigned instance id and
     * validation issue from the store; the returned setter writes immediately.
     */
    public useCredential(nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) {
        const [instanceId, issue] = this.useDocument(d => [
            d.selectors.credential.getInstance(d, nodeId, templateId),
            d.selectors.credential.getIssue(d, nodeId, templateId),
        ] as const);

        const setInstance = useCallback(
            (id: Vault.Credential.Instance.Id | null) =>
                this.actions.credential.setInstance(nodeId, templateId, id),
            [nodeId, templateId]
        );

        return [instanceId, setInstance, issue] as const;
    }


    public openWorkflowWindow(workflowId: Workflow.Id): void {
        window.open(`/workflow/${workflowId}`, "_blank");
    }

    public readonly canvasWrapper = createRef<HTMLDivElement>();

    public readonly createDrivers = createDrivers
    public readonly reconcileNodeDrivers = reconcileNodeDrivers
    public readonly reconcileEdgeDrivers = reconcileEdgeDrivers
}





export const WorkbenchSDK = SDK.get<WorkbenchSDKImpl>("Workbench")





export namespace WorkbenchSDK {
    // Pointer and gesture state only. The document lives in its own store.
    export interface State {
        isDraggingNode: boolean;
        lastSelection: OnSelectionChangeParams<NodeDriver, EdgeDriver> | null;
        clickedNodeId: Workflow.Node.Id | null;
        selectionContextMenu: { x: number, y: number } | null;
        paneContextMenu: { x: number, y: number } | null;
        draggedPort: PortRef | null
    }

    export interface PortRef {
        nodeId: Workflow.Node.Id,
        port: Foundations.Port.Input | Foundations.Port.Output,
        direction: "source" | "target"
    }

    export type Selectors      = Document.Selectors
    export type Actions        = _WorkbenchSDKActions
    export type Dialogs        = _WorkbenchSDKDialogs
    export type Reducers       = Document.Reducers
    export type EditorReducers = typeof editorReducers

    export type NodeDriver = RF_Node<{}, "workflowNode">;
    export type EdgeDriver = RF_Edge<{}, "workflowEdge">;
    export type CycleSelectionNodeDriver = RF_Node<{ width: number, height: number, nodeIds: Workflow.Node.Id[], issue: Validation.Issue.Cycle }, "cycleSelectionNode">;
    export type AnnotationDriver = RF_Node<{}, "annotation">;

    export type DriverConnection = Document.DriverConnection

    export type NodeBundle = [
        node: Workflow.Node.Raw,
        blueprint: Foundations.Blueprint,
        ui: NodeUI,
        connectedPorts: Record<Port.Input.Id, Workflow.Edge.Id>
    ]
}
