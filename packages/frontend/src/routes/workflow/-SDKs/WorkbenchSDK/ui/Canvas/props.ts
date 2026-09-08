import { addEdge, applyEdgeChanges, applyNodeChanges, reconnectEdge, MarkerType, SelectionMode } from '@xyflow/react'
import type { ReactFlowProps, OnSelectionChangeParams } from "@xyflow/react"
import { WorkbenchSDK } from "../../sdk"
import CanvasEdge from './Edge'
import CanvasNode from './Node'
import { ProblematicCycleSelectionNode } from './extraNodes'
import { portColorVar } from '@/utils/styleUtils'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import { clearDragImage } from '@/routes/workflow/-SDKs/ShelfSDK/ui/DrawerItem'
import { Workflow, Foundations, Validation } from "@pretzel-graph/shared/domain"
import { withCyclesRecompute } from '../../utils/actions'
import { ExecutionSDK } from '../../../ExecutionSDK/sdk'

type NodeDriver = WorkbenchSDK.NodeDriver | WorkbenchSDK.CycleSelectionNodeDriver
type EdgeDriver = WorkbenchSDK.EdgeDriver

const setState = WorkbenchSDK.useStore.setState;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const fitViewOptions = {
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
};


export const canvasProps = Object.freeze({
    selectionMode: SelectionMode.Partial,
    connectionRadius: 30,
    elevateEdgesOnSelect: false,
    fitViewOptions,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    panActivationKeyCode: null,
    edgeTypes: {
        workflowEdge: CanvasEdge
    },
    nodeTypes: {
        workflowNode: CanvasNode,
        cycleSelectionNode: ProblematicCycleSelectionNode,
    }
} satisfies ReactFlowProps<NodeDriver, EdgeDriver>)


export const convertMousePositionToCanvas = (mousePosX: number, mousePosY: number) => {
    const canvasDriver = WorkbenchSDK.runtime.canvasDriver;

    if (!canvasDriver) return { x: 0, y: 0 };

    // Get viewport info (zoom and pan)
    const { x: viewportX, y: viewportY, zoom } = canvasDriver.getViewport();

    // Get the canvas bounding rect to account for canvas position on screen
    const canvasRect = WorkbenchSDK.canvasWrapper.current?.getBoundingClientRect();
    if (!canvasRect) return { x: 0, y: 0 };

    // Convert screen coordinates to canvas coordinates
    // 1. Subtract canvas offset to get position relative to canvas
    // 2. Subtract viewport pan
    // 3. Divide by zoom to get actual canvas position
    const canvasX = (mousePosX - canvasRect.left - viewportX) / zoom;
    const canvasY = (mousePosY - canvasRect.top - viewportY) / zoom;

    return { x: canvasX, y: canvasY };
}

export const createCanvasCallbacks = (
    setNodeDrivers: React.Dispatch<React.SetStateAction<NodeDriver[]>>,
    setEdgeDrivers: React.Dispatch<React.SetStateAction<EdgeDriver[]>>
) => {
    return {

        onInit: (instance) => {
            WorkbenchSDK.runtime.canvasDriver = instance
        },
        onDrop: (event) => {
            if (WorkbenchSDK.isLocked)
                return;

            const blueprintId = event.dataTransfer.getData("blueprintId") as Foundations.Blueprint.Id
            if (!blueprintId)
                return

            clearDragImage();

            const blueprint = ShelfSDK.state.blueprints[blueprintId];
            if (!blueprint)
                return;

            WorkbenchSDK.actions.node.create(
                blueprint,
                convertMousePositionToCanvas(event.clientX, event.clientY),
                undefined
            )
        },

        onNodesChange: (changes) => {
            WorkbenchSDK.setDocument(withCyclesRecompute(d => {
                changes.forEach(change => {
                    switch (change.type) {
                        // case "position" is handled in onNodeDragStop
                        case "add":
                            break;
                        case "remove":
                            WorkbenchSDK.reducers.node.remove(d, change.id as Workflow.Node.Id)
                            break;
                        case "replace":
                            break;
                        case "select":
                            break;
                    }
                })
            }))

            WorkbenchSDK.actions.debouncedCommit();

            setNodeDrivers(prev => applyNodeChanges(changes, prev))
        },

        onEdgesChange: (changes) => {
            WorkbenchSDK.setDocument(withCyclesRecompute(d => {
                changes.forEach(change => {
                    switch (change.type) {
                        case "add":
                            break;
                        case "remove":
                            WorkbenchSDK.reducers.edge.remove(d, change.id as Workflow.Edge.Id);
                            break;
                        case "select":
                            break;

                        case "replace":
                            break;
                    }
                })
            }))

            WorkbenchSDK.actions.debouncedCommit();

            setEdgeDrivers(prev => applyEdgeChanges(changes, prev))
        },

        // On Edge Reconnect (previously onEdgeUpdate)
        onReconnect: (edgeDriver, newConn) => {
            if (WorkbenchSDK.isLocked) return;

            const state = WorkbenchSDK.document

            if (
                Validation.Connection.isValid(
                    newConn as WorkbenchSDK.DriverConnection,
                    state.data,
                    state.cache,
                ) === false
            )
                return;

            setEdgeDrivers(prev => reconnectEdge(edgeDriver, newConn, prev))
        },
        onReconnectStart: () => {
            WorkbenchSDK.runtime.isReconnectionSuccessful = false
        },
        onReconnectEnd: (e, edgeDriver, handleType) => {
            const edgeId = edgeDriver.id as Workflow.Edge.Id;
            // If the reconnection was not successful, remove the edge
            if (WorkbenchSDK.runtime.isReconnectionSuccessful === false) {
                WorkbenchSDK.actions.edge.remove(edgeId)
                setEdgeDrivers(prev => prev.filter(ed => ed.id !== edgeId))
            }
            WorkbenchSDK.runtime.isReconnectionSuccessful = true
        },
        onNodeDrag: (e, node) => {
            // TODO: Helper lines in the future
        },
        onNodeDragStart: () => {
            setState(s => { s.isDraggingNode = true })
        },
        onNodeDragStop: (e, node, nodes) => {
            const movedNodes = (nodes && nodes.length > 0) ? nodes : [node];

            // Positions land on the document first; the drag flag clears once they have.
            WorkbenchSDK.setDocument(d => {
                for (const _node of movedNodes) {
                    const newPosition = _node.position;
                    const nodeId = _node.id as Workflow.Node.Id;
                    WorkbenchSDK.reducers.layout.node.setPosition(d, nodeId, newPosition)
                }
            })
            WorkbenchSDK.setState(s => { s.isDraggingNode = false })

            WorkbenchSDK.actions.debouncedCommit();
        },
        onNodeContextMenu: (e, nodeDriver) => {
            e.preventDefault();
            if (WorkbenchSDK.isLocked) return;

            WorkbenchSDK.actions.setSelectionContextMenu(null);
            WorkbenchSDK.actions.setClickedNodeId(nodeDriver.id as Workflow.Node.Id);
        },
        onSelectionContextMenu: (e, _nodes) => {
            e.preventDefault();
            if (WorkbenchSDK.isLocked) return;

            WorkbenchSDK.actions.setSelectionContextMenu({ x: e.clientX, y: e.clientY });
        },
        onPaneContextMenu: (e) => {
            e.preventDefault();
            WorkbenchSDK.actions.setSelectionContextMenu(null);
            WorkbenchSDK.actions.setPaneContextMenu({ x: e.clientX, y: e.clientY });
        },
        onMoveEnd: (_, viewport) => {
            WorkbenchSDK.actions.layout.viewport.set(viewport)
        },
        onConnect: (conn) => {
            const { source, sourceHandle, target, targetHandle } = conn
            if (!sourceHandle || !targetHandle || !source || !target) return;

            WorkbenchSDK.actions.edge.create(conn as WorkbenchSDK.DriverConnection)
        },
        onConnectStart: (_, params) => {
            const { nodeId, handleId, handleType } = params;

            if (nodeId === null || handleId === null || handleType === null)
                return

            let port: Foundations.Port.Input | Foundations.Port.Output | null;

            if (handleType === "source")
                port = WorkbenchSDK.selectors.output.get(
                    WorkbenchSDK.document,
                    nodeId as Workflow.Node.Id,
                    handleId as Foundations.Port.Output.Id
                )
            else
                port = WorkbenchSDK.selectors.input.get(
                    WorkbenchSDK.document,
                    nodeId as Workflow.Node.Id,
                    handleId as Foundations.Port.Input.Id
                )

            if (port === null)
                return

            WorkbenchSDK.actions.setDraggedPort({
                nodeId: nodeId as Workflow.Node.Id,
                port,
                direction: handleType
            })
        },
        onConnectEnd: (event, params) => {
            WorkbenchSDK.actions.setDraggedPort(null)
        },

        onDragOver: (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
        },

        onSelectionDragStart: () => {

        },

        // Click on the background pane
        onPaneClick: (e) => {
            WorkbenchSDK.actions
                .setClickedNodeId(null)

            ExecutionSDK.actions
                .timeline.selectUoW(null)
        },
        onEdgeClick: (event, edge) => {
            if (!edge.sourceHandle || !edge.targetHandle) return;

            if (WorkbenchSDK.isLocked) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            const sourceOutputs = WorkbenchSDK.selectors.node.getOutputs(WorkbenchSDK.document, edge.source as Workflow.Node.Id);
            const output = sourceOutputs.find(o => o.id === edge.sourceHandle as Foundations.Port.Output.Id)

            if (!output) return;
            WorkbenchSDK.canvasWrapper.current?.style.setProperty("--selected", `var(${portColorVar(output.variant)})`);
        }, 
        onNodeClick: (event, node) => {
            event.stopPropagation();

            if (WorkbenchSDK.isLocked) return; 

            WorkbenchSDK.actions.setClickedNodeId(node.id as Workflow.Node.Id)
        },

        onSelectionChange: (selection) => {
            setState(s => {
                s.lastSelection = selection as OnSelectionChangeParams<WorkbenchSDK.NodeDriver, WorkbenchSDK.EdgeDriver>

                // if (selection.nodes && (selection.nodes.length === 0 || selection.nodes.length > 1)) {
                //     WorkbenchSDK.reducers
                //         .setClickedNodeId(s, null)
                // }
            })
        },



        // Copy key tracking
        onKeyDown: (e) => {
            if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
                console.log("Attempting to copy selection ", WorkbenchSDK.state.lastSelection)

                WorkbenchSDK.actions.clipboard.copy();
            }
            if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                console.log("Attempting to paste selection ", e)

                const { x, y } = WorkbenchSDK.runtime.lastMousePosition;
                const canvasPosition = convertMousePositionToCanvas(x, y);

                WorkbenchSDK.actions.clipboard.paste(canvasPosition);
            }
        },

        isValidConnection: (conn) => {
            return true;
        }
    } satisfies ReactFlowProps<NodeDriver, EdgeDriver>
}
