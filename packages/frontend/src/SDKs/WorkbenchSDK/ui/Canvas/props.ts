import { addEdge, applyEdgeChanges, applyNodeChanges, reconnectEdge } from '@xyflow/react'
import type { ReactFlowProps } from "@xyflow/react"
import { WorkbenchSDK } from "../../sdk"
import WorkflowEdge from './Edge'
import WorkbenchNode from './Node'
import { nodeColorsName } from '@/utils/styleUtils'
import { isConnectionValid } from '../../utils'
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk'
import { Workflow, Shelf, Foundations } from "@vx-agent-editor/shared/types"

type NodeDriver = WorkbenchSDK.NodeDriver
type EdgeDriver = WorkbenchSDK.EdgeDriver

const setState = WorkbenchSDK.useStore.setState;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const fitViewOptions = {
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
};


export const canvasProps = Object.freeze({
    connectionRadius: 30,
    elevateEdgesOnSelect: false,
    fitViewOptions,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    edgeTypes: {
        workflowEdge: WorkflowEdge
    },
    nodeTypes: {
        workflowNode: WorkbenchNode,
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
    setNodeDrivers: React.Dispatch<React.SetStateAction<WorkbenchSDK.NodeDriver[]>>,
    setEdgeDrivers: React.Dispatch<React.SetStateAction<WorkbenchSDK.EdgeDriver[]>>
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

            const grabbedElements = document.getElementsByClassName("cursor-grabbing");
            if (grabbedElements.length > 0)
                document.body.removeChild(grabbedElements[0]);

            const blueprint = ShelfSDK.state.blueprints[blueprintId];
            if (!blueprint) 
                return;

            WorkbenchSDK.actions.node.create(
                blueprint,
                convertMousePositionToCanvas(event.clientX, event.clientY)
            )
        },

        onNodesChange: (changes) => {
            WorkbenchSDK.useStore.setState(s => {
                changes.forEach(change => {
                    switch (change.type) {
                        // case "position" is handled in onNodeDragStop
                        case "add":
                            break;
                        case "remove":
                            WorkbenchSDK.reducers.node.remove(s, change.id as Workflow.Node.Id)
                            break;
                        case "replace":
                            break;
                        case "select":
                            break;
                    }
                })
            })

            WorkbenchSDK.actions.commit();

            setNodeDrivers(prev => applyNodeChanges(changes, prev))
        },

        onEdgesChange: (changes) => {
            WorkbenchSDK.setState(s => {
                changes.forEach(change => {
                    switch (change.type) {
                        case "add":
                            break;
                        case "remove":
                            WorkbenchSDK.reducers.edge.remove(s, change.id as Workflow.Edge.Id);
                            break;
                        case "select":
                            break;

                        case "replace":
                            break;
                    }
                })
            })

            WorkbenchSDK.actions.commit();

            setEdgeDrivers(prev => applyEdgeChanges(changes, prev))
        },

        // On Edge Reconnect (previously onEdgeUpdate)
        onReconnect: (edgeDriver, newConn) => {
            if (WorkbenchSDK.isLocked) return;

            if (isConnectionValid(WorkbenchSDK.state, newConn) === false)
                return;

            setEdgeDrivers(prev => reconnectEdge(edgeDriver, newConn, prev))
        },
        onReconnectStart: () => {
            WorkbenchSDK.runtime.isReconnectionSuccessful = false
        },
        onReconnectEnd: (e, edgeDriver, handleType) => {
            // If the reconnection was not successful, remove the edge
            if (WorkbenchSDK.runtime.isReconnectionSuccessful === false) {
                setState(s => {
                    WorkbenchSDK.reducers.edge.remove(s, edgeDriver.id as Workflow.Edge.Id)
                })
                setEdgeDrivers(prev => prev.filter(ed => ed.id !== edgeDriver.id))
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
            WorkbenchSDK.setState(s => {
                s.isDraggingNode = false

                const movedNodes = (nodes && nodes.length > 0) ? nodes : [node];

                for (const _node of movedNodes) {
                    const newPosition = _node.position;
                    const nodeId = _node.id as Workflow.Node.Id;
                    WorkbenchSDK.reducers.layout.node.setPosition(s, nodeId, newPosition)
                }
            })

            WorkbenchSDK.actions.commit();
        },
        onNodeContextMenu: (e, nodeDriver) => {
            e.preventDefault();
            if (WorkbenchSDK.isLocked) return;

            WorkbenchSDK.actions
                .setClickedNodeId(nodeDriver.id as Workflow.Node.Id)
        },
        onMoveEnd: (event, viewport) => {
            WorkbenchSDK.actions.layout.viewport.set(viewport)
        },
        onConnect: (conn) => {
            const { source, sourceHandle, target, targetHandle } = conn as WorkbenchSDK.DriverConn
            if (!sourceHandle || !targetHandle || !source || !target) return;

            const edgeId = WorkbenchSDK.reducers.createEdgeId(source, sourceHandle, target, targetHandle)

            WorkbenchSDK.actions.edge.add(edgeId, conn);

            setEdgeDrivers(prev => {
                const newEdgeDriver: EdgeDriver = {
                    id: edgeId,
                    source: source,
                    target: target,
                    sourceHandle,
                    targetHandle,
                    type: 'workflowEdge',
                }

                return addEdge(newEdgeDriver, prev)
            })
        },
        onConnectStart: (event, params) => {
            const { nodeId, handleId, handleType } = params;

            if (nodeId === null || handleId === null || handleType === null)
                return

            let field: Foundations.Port.Input | Foundations.Port.Output | null;

            if (handleType === "source")
                field = WorkbenchSDK.selectors.getOutput(
                    WorkbenchSDK.state,
                    nodeId as Workflow.Node.Id,
                    handleId as Foundations.Port.Output.Id
                )
            else
                field = WorkbenchSDK.selectors.getInput(
                    WorkbenchSDK.state,
                    nodeId as Workflow.Node.Id,
                    handleId as Foundations.Port.Input.Id
                )

            if (field === null)
                return

            WorkbenchSDK.actions.setCurrentDraggedHandle({
                nodeId: nodeId as Workflow.Node.Id,
                field,
                handleType
            })
        },
        onConnectEnd: (event, params) => {
            WorkbenchSDK.actions.setCurrentDraggedHandle(null)
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

            ShelfSDK.actions
                .searchFilter.setDataTypes(null);
        },
        onEdgeClick: (event, edge) => {
            if (!edge.sourceHandle || !edge.targetHandle) return;

            if (WorkbenchSDK.isLocked) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }


            const sourceNode = WorkbenchSDK.state.workflow.data.nodes[edge.source as Workflow.Node.Id];
            const output = sourceNode.outputs.find(o => o.id === edge.sourceHandle as Foundations.Port.Output.Id)

            if (!output) return;
            const selectedAccentColor = nodeColorsName[output.variant[0]] ?? "cyan";
            WorkbenchSDK.canvasWrapper.current?.style.setProperty("--selected", `var(--datatype-${selectedAccentColor})`);
        },
        onNodeClick: (event, node) => {
            event.stopPropagation();

            if (WorkbenchSDK.isLocked) return;

            WorkbenchSDK.actions.setClickedNodeId(node.id as Workflow.Node.Id)
        },

        onSelectionChange: (selection) => {
            setState(s => {
                s.lastSelection = selection

                // if (selection.nodes && (selection.nodes.length === 0 || selection.nodes.length > 1)) {
                //     WorkbenchSDK.reducers
                //         .setClickedNodeId(s, null)
                // }
            })
        },

        isValidConnection: (conn) => {
            return true;
        }
    } satisfies ReactFlowProps<NodeDriver, EdgeDriver>
}
