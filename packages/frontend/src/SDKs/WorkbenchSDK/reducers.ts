import { WorkbenchSDK } from './sdk';
import type { Connection } from '@xyflow/react';
import { Workflow, Foundations } from "@vx-agent-editor/shared/domain";
import { cloneDeep } from 'lodash';
import { type InputContainer } from './utils';
import { toast } from 'sonner';

const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

const createNodeId: NodeReducers["createId"] = (blueprintId) => {
    return `${blueprintId}-${uid.randomUUID(5)}` as Workflow.Node.Id
}

const createRuntimeInputId = (parentInputId: Foundations.Port.Input.Id, display_name: string) => {
    return `__${parentInputId}|${display_name}__` as Foundations.Port.Input.Id
}

export function _createWorkbenchReducers_(sel: WorkbenchSDK.Selectors) {

    // ════════════════════════════════════════════════════════════════════════════
    // CACHE REDUCERS (Internal - maintains lookup maps for fast graph traversal)
    // ════════════════════════════════════════════════════════════════════════════
    const cacheReducers = {
        deleteEdge: (s, { source, target }) => {
            const inNodes = sel.ensureInNodesCache(s, target.nodeId);
            delete inNodes[source.nodeId]

            const outNodes = sel.ensureOutNodesCache(s, source.nodeId);
            delete outNodes[target.nodeId]

            delete s.cache.inputHandlesMap[target.nodeId][target.portId];
            delete s.cache.outputHandlesMap[source.nodeId][source.portId]
        },
        addEdge: (s, { source, target, id: edgeId }) => {
            sel.ensureInNodesCache(s, target.nodeId)[source.nodeId] = edgeId;
            sel.ensureOutNodesCache(s, source.nodeId)[target.nodeId] = edgeId

            s.cache.inputHandlesMap[target.nodeId][target.portId] = edgeId
            s.cache.outputHandlesMap[source.nodeId][source.portId] = edgeId

            // Don't delete s.workflow.fieldValues[target.nodeId][target.portId] here
        },
        deleteNode: (s, deletedNodeId) => {
            // Delete the edges coming into the node 
            const inNodes = sel.ensureInNodesCache(s, deletedNodeId)

            Object.entries(inNodes).forEach(([_inNodeId, _edgeId]) => {
                edgeReducers.remove(s, _edgeId);
            })

            // Delete the edges going out of the nodes
            const outNodes = sel.ensureOutNodesCache(s, deletedNodeId)

            Object.entries(outNodes).forEach(([_outNodeId, _edgeId]) => {
                edgeReducers.remove(s, _edgeId);
            })

            delete s.cache.ingoersEdgesMap[deletedNodeId];
            delete s.cache.outgoersEdgesMap[deletedNodeId];

            delete s.cache.inputHandlesMap[deletedNodeId];
            delete s.cache.outputHandlesMap[deletedNodeId];
        },
        createNode: (s, newNode) => {
            const ingoerEdges = {}
            const outgoerEdges = {}
            s.cache.ingoersEdgesMap[newNode.id] = ingoerEdges
            s.cache.outgoersEdgesMap[newNode.id] = outgoerEdges

            s.cache.inputHandlesMap[newNode.id] = {}
            s.cache.outputHandlesMap[newNode.id] = {}
        },
        deleteInput: (s, nodeId, inputId) => {
            const edge = s.cache.inputHandlesMap[nodeId][inputId];
            if (edge)
                edgeReducers.remove(s, edge);
        },
        createAll: (_, wf) => {
            const outgoersEdgesMap: WorkbenchSDK.State["cache"]["outgoersEdgesMap"] = {};
            const ingoersEdgesMap: WorkbenchSDK.State["cache"]["ingoersEdgesMap"] = {};
            const inputHandlesMap: WorkbenchSDK.State["cache"]["inputHandlesMap"] = {};
            const outputHandlesMap: WorkbenchSDK.State["cache"]["outputHandlesMap"] = {};

            Object.values(wf.data.nodes).forEach(node => {
                outgoersEdgesMap[node.id] = {};
                ingoersEdgesMap[node.id] = {};
                inputHandlesMap[node.id] = {};
                outputHandlesMap[node.id] = {};
            })

            Object.values(wf.data.edges).forEach(edge => {
                const sourceNodeId = edge.source.nodeId;
                const targetNodeId = edge.target.nodeId;

                const sourceHandleId = edge.source.portId;
                const targetHandleId = edge.target.portId

                // Outgoers Edges Map
                outgoersEdgesMap[sourceNodeId][targetNodeId] = edge.id

                // Ingoers Edges Map
                ingoersEdgesMap[targetNodeId][sourceNodeId] = edge.id

                inputHandlesMap[targetNodeId][targetHandleId] = edge.id

                outputHandlesMap[sourceNodeId][sourceHandleId] = edge.id
            })

            return {
                outgoersEdgesMap,
                ingoersEdgesMap,
                inputHandlesMap,
                outputHandlesMap,
            }
        }
    } satisfies INTERNAL_CacheReducers

    // ════════════════════════════════════════════════════════════════════════════
    // EDGE REDUCERS
    // ════════════════════════════════════════════════════════════════════════════
    const edgeReducers = {
        add: (s, edgeId, conn) => {
            s.isDirty = true;
            const { source: sourceNodeId, sourceHandle, target: targetNodeId, targetHandle } = conn as {
                source: Workflow.Node.Id,
                sourceHandle: Foundations.Port.Output.Id,
                target: Workflow.Node.Id,
                targetHandle: Foundations.Port.Input.Id
            }
            if (!sourceHandle || !targetHandle || !sourceNodeId || !targetNodeId) return;

            const edges = s.workflow.data.edges

            if (edges[edgeId])
                return

            const newEdge: Workflow.Edge = {
                id: edgeId,
                source: {
                    nodeId: sourceNodeId,
                    portId: sourceHandle
                },
                target: {
                    nodeId: targetNodeId,
                    portId: targetHandle
                }
            }

            edges[edgeId] = newEdge

            cacheReducers.addEdge(s, newEdge)
        },
        remove: (s, edgeId) => {
            s.isDirty = true;
            const edges = s.workflow.data.edges

            const edge = edges[edgeId];
            if (!edge) return;

            delete edges[edgeId];

            cacheReducers.deleteEdge(s, edge);
        },
    } satisfies EdgeReducers;

    // ════════════════════════════════════════════════════════════════════════════
    // LAYOUT REDUCERS (UI positioning - node positions and viewport)
    // ════════════════════════════════════════════════════════════════════════════
    const layoutReducers = {
        node: {
            setPosition: (s, nodeId, newLayout) => {
                if (!newLayout)
                    return
                const oldNodeLayout = s.workflow.data.ui.layout[nodeId];
                if (newLayout.x === oldNodeLayout.x && newLayout.y === oldNodeLayout.y) {
                    return
                }
                s.isDirty = true
                s.workflow.data.ui.layout[nodeId] = newLayout;
            },
            remove: (s, nodeId) => {
                s.isDirty = true;
                const layout = s.workflow.data.ui.layout;
                delete layout[nodeId];
            },
            add: (s, nodeId, position) => {
                s.isDirty = true;
                s.workflow.data.ui.layout[nodeId] = position;
            }
        },
        viewport: {
            setPosition: (s, position) => {
                s.isDirty = true;
                const viewport = s.workflow.data.ui.viewport
                viewport.x = position.x;
                viewport.y = position.y;
            },
            setZoom: (s, zoom) => {
                s.isDirty = true;
                const viewport = s.workflow.data.ui.viewport
                viewport.zoom = zoom;
            },
            set: (s, viewport) => {
                s.isDirty = true;
                s.workflow.data.ui.viewport = viewport;
            }
        }
    } satisfies LayoutReducers

    // ════════════════════════════════════════════════════════════════════════════
    // NODE REDUCERS
    // ════════════════════════════════════════════════════════════════════════════
    const nodeReducers = {
        remove: (s, deletedNodeId) => {
            s.isDirty = true;
            const nodes = s.workflow.data.nodes
            const staticValues = s.workflow.data.staticValues

            if (nodes[deletedNodeId])
                delete nodes[deletedNodeId];

            delete staticValues[deletedNodeId];

            cacheReducers.deleteNode(s, deletedNodeId);
            layoutReducers.node.remove(s, deletedNodeId);
        },
        createId: createNodeId,
        // TODO: Migrate from DB schema creation to runtime schema creation from backend
        create: (s, blueprint, position) => {
            s.isDirty = true;
            const nodeId = createNodeId(blueprint.id);
            const newNode = {
                id: nodeId,
                blueprintId: blueprint.id,
                displayName: blueprint.displayName,

                fields: cloneDeep(blueprint.fields) as Workflow.Node['fields'],
                inputs: cloneDeep(blueprint.inputs) as Workflow.Node['inputs'],
                outputs: cloneDeep(blueprint.outputs) as Workflow.Node["outputs"],
                icon: blueprint.icon,
                description: blueprint.description,
                isMinimized: false,
            } satisfies Workflow.Node

            const result = Workflow.Node.Schema.safeParse(newNode)
            if (!result.success) {
                console.error("WorkbenchSDK: Node schema validation failed:", result.error)
                toast.error(`WorkbenchSDK: Node schema validation failed. Could not create node from blueprint id ${blueprint.id}`,)
                return;
            }

            s.workflow.data.nodes[nodeId] = newNode;

            layoutReducers.node.add(s, nodeId, position);

            s.workflow.data.staticValues[nodeId] = {}

            cacheReducers.createNode(s, newNode);
        },
        setMinimized: (s, nodeId, isMinimized) => {
            s.isDirty = true;
            s.workflow.data.nodes[nodeId].isMinimized = isMinimized;
        },
        setDisplayName: (s, nodeId, newDisplayName) => {
            s.isDirty = true;
            s.workflow.data.nodes[nodeId].displayName = newDisplayName;
        },
        setDescription: (s, nodeId, newDescription) => {
            s.isDirty = true;
            s.workflow.data.nodes[nodeId].description = newDescription;
        }
    } satisfies NodeReducers


    const fieldReducers = {
        setValue: (s, nodeId, fieldId, value) => {
            s.isDirty = true;
            s.workflow.data.staticValues[nodeId] ??= {}
            s.workflow.data.staticValues[nodeId][fieldId] = value
        }
    } satisfies FieldReducers


    // ════════════════════════════════════════════════════════════════════════════
    // INPUT REDUCERS
    // ════════════════════════════════════════════════════════════════════════════
    const inputReducers = {
        setValue: (s, nodeId, inputId, value) => {
            s.isDirty = true;
            s.workflow.data.staticValues[nodeId] ??= {}
            s.workflow.data.staticValues[nodeId][inputId] = value
        },
        remove: (s, nodeId, inputId) => {
            s.isDirty = true;
            const node = s.workflow.data.nodes[nodeId];
            const staticValues = s.workflow.data.staticValues[nodeId];

            cacheReducers.deleteInput(s, nodeId, inputId);

            const inputIndex = node.inputs.findIndex(i => i.id === inputId);
            if (inputIndex !== -1) {
                node.inputs.splice(inputIndex, 1);
            }
            delete staticValues[inputId];
        },
        disconnectIfConnected: (s, nodeId, inputId) => {
            s.isDirty = true;
            const edgeId = s.cache.inputHandlesMap[nodeId][inputId]

            if (edgeId) {
                edgeReducers.remove(s, edgeId)
                return true;
            }
            return false;
        },
        changeOrder: (s, nodeId, active, over) => {
            s.isDirty = true;
            const node = s.workflow.data.nodes[nodeId];
            if (!node) return;

            const from = active.containerId;
            const to = over.containerId;

            const activeId = active.id;
            const overId = over?.id ?? null;

            const inputs = node.inputs;

            // Find the active input
            const activeIndex = inputs.findIndex(i => i.id === activeId);
            if (activeIndex === -1) return;

            const activeInput = inputs[activeIndex];

            // Same category reorder
            if (from === to) {
                if (!overId) return;
                const overIndex = inputs.findIndex(i => i.id === overId);
                if (overIndex === -1) return;

                // Remove and reinsert at new position
                inputs.splice(activeIndex, 1);
                inputs.splice(overIndex > activeIndex ? overIndex : overIndex, 0, activeInput);
                return;
            }

            // // Cross-category moves: normal <-> advanced
            // if ((from === "normal" && to === "advanced") || (from === "advanced" && to === "normal")) {
            //     // Update the advanced property
            //     activeInput.advanced = to === "advanced";

            //     // If overId exists, reposition relative to it
            //     if (overId) {
            //         const overIndex = inputs.findIndex(i => i.id === overId);
            //         if (overIndex !== -1 && overIndex !== activeIndex) {
            //             inputs.splice(activeIndex, 1);
            //             inputs.splice(overIndex > activeIndex ? overIndex : overIndex, 0, activeInput);
            //         }
            //     }
            //     return;
            // }

            // Connected category - just reorder within input array (connected is a virtual category)
            if (from === "connected" && to === "connected") {
                if (!overId) return;
                const overIndex = inputs.findIndex(i => i.id === overId);
                if (overIndex === -1) return;

                inputs.splice(activeIndex, 1);
                inputs.splice(overIndex > activeIndex ? overIndex : overIndex, 0, activeInput);
                return;
            }

            // Don't allow moves into/out of connected category
        }
    } satisfies InputReducers


    // ════════════════════════════════════════════════════════════════════════════
    // WORKFLOW REDUCERS (Top-level workflow operations)
    // ════════════════════════════════════════════════════════════════════════════
    const workflowReducers = {
        setLock: (s, lock) => {
            if (s.workflow.locked === lock)
                return
            s.isDirty = true;
            s.workflow.locked = lock;
        },
        open: (s, workflow) => {
            s.workflow = workflow;
            s.cache = cacheReducers.createAll(s, workflow);
        },
        close: (s) => {
            s.workflow = cloneDeep(Workflow.INITIAL);
            s.cache = cacheReducers.createAll(s, cloneDeep(Workflow.INITIAL));
        }
    } satisfies WorkflowReducers

    return {
        field: fieldReducers,
        edge: edgeReducers,
        node: nodeReducers,
        input: inputReducers,
        workflow: workflowReducers,
        layout: layoutReducers,
        createNodeId: createNodeId,
        setClickedNodeId: (s, nodeId) => { s.clickedNodeId = nodeId; },
        createEdgeId: (_sourceNodeId, _sourcePortId, _targetNodeId, _targetPortId) => {
            return `${_sourceNodeId}|${_sourcePortId}|${_targetNodeId}|${_targetPortId}` as Workflow.Edge.Id
        }
    } satisfies _WorkbenchSDKReducers
}

// ════════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════════
type INTERNAL_CacheReducers = {
    deleteEdge: (state: WorkbenchSDK.State, edge: Workflow.Edge) => void
    addEdge: (state: WorkbenchSDK.State, newEdge: Workflow.Edge) => void
    deleteNode: (state: WorkbenchSDK.State, deletedNodeId: Workflow.Node.Id) => void
    createNode: (state: WorkbenchSDK.State, newNode: Workflow.Node) => void
    deleteInput: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => void
    createAll: (state: WorkbenchSDK.State, workflow: Workflow) => WorkbenchSDK.State["cache"]
}

type EdgeReducers = {
    add: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id, conn: Connection) => void
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
}

type NodeReducers = {
    remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void
    createId: (blueprintId: Foundations.Blueprint.Id) => Workflow.Node.Id
    create: (state: WorkbenchSDK.State, blueprint: Foundations.Blueprint, position: { x: number, y: number }) => void
    setMinimized: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isMinimized: boolean) => void
    setDisplayName: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDisplayName: string) => void
    setDescription: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDescription: string) => void
}

type LayoutReducers = {
    node: {
        setPosition: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, position: { x: number, y: number } | undefined) => void
        remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void
        add: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, position: { x: number, y: number }) => void
    },
    viewport: {
        setPosition: (state: WorkbenchSDK.State, newLayout: { x: number, y: number }) => void
        setZoom: (state: WorkbenchSDK.State, zoom: number) => void
        set: (state: WorkbenchSDK.State, viewport: { x: number, y: number, zoom: number }) => void
    }
}

type InputReducers = {
    setValue: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        inputId: Foundations.Port.Input.Id,
        value: any
    ) => void
    disconnectIfConnected: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        inputId: Foundations.Port.Input.Id
    ) => boolean
    changeOrder: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        active: {
            id: Foundations.Port.Input.Id,
            items: Foundations.Port.Input.Id[], // holds the current items where id is from
            containerId: InputContainer      // holds the current container id where the id is from
        },
        over: {
            id: Foundations.Port.Input.Id,
            items: Foundations.Port.Input.Id[],
            containerId: InputContainer
        }
    ) => void,
    remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => void
}


type FieldReducers = {
    setValue: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id,
        value: Foundations.Field.Value
    ) => void
}

type WorkflowReducers = {
    setLock: (state: WorkbenchSDK.State, lock: boolean) => void
    open: (state: WorkbenchSDK.State, workflow: Workflow) => void
    close: (state: WorkbenchSDK.State) => void
}

export type _WorkbenchSDKReducers = {
    field: FieldReducers,
    edge: EdgeReducers
    node: NodeReducers,
    input: InputReducers,
    workflow: WorkflowReducers,
    layout: LayoutReducers,
    setClickedNodeId: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id | null) => void
    createNodeId: (blueprintId: Foundations.Blueprint.Id) => Workflow.Node.Id
    createEdgeId: (
        sourceNodeId: Workflow.Node.Id,
        sourceHandleId: Foundations.Port.Output.Id,
        targetNodeId: Workflow.Node.Id,
        targetHandleId: Foundations.Port.Input.Id
    ) => Workflow.Edge.Id
}