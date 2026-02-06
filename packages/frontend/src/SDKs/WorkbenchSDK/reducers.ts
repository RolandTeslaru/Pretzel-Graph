import { WorkbenchSDK } from './sdk';
import type { Connection } from '@xyflow/react';
import { Workflow, Foundations } from "@vx-agent-editor/shared/types";
import { cloneDeep } from 'lodash';
import { type InputContainer, insertBeforeOrEndInPlace, moveInArray, removeInPlace, reorderSubsetInPlace } from './utils';
import { EMPTY_WORKFLOW } from './defaults';

const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

const createNodeId: NodeReducers["createId"] = (blueprintId) => {
    return `${blueprintId}-${uid.randomUUID(5)}` as Workflow.Node.Id
}

const createRuntimeInputId = (parentInputId: Foundations.Input.Id, display_name: string) => {
    return `__${parentInputId}|${display_name}__` as Foundations.Input.Id
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

            delete s.cache.inputHandlesMap[target.nodeId][target.handleId];
            delete s.cache.outputHandlesMap[source.nodeId][source.handleId]
        },
        addEdge: (s, { source, target, id: edgeId }) => {
            sel.ensureInNodesCache(s, target.nodeId)[source.nodeId] = edgeId;
            sel.ensureOutNodesCache(s, source.nodeId)[target.nodeId] = edgeId

            s.cache.inputHandlesMap[target.nodeId][target.handleId] = edgeId
            s.cache.outputHandlesMap[source.nodeId][source.handleId] = edgeId

            // Don't delete s.workflow.fieldValues[target.nodeId][target.handleId] here
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

                const sourceHandleId = edge.source.handleId;
                const targetHandleId = edge.target.handleId

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
                sourceHandle: Foundations.Output.Id,
                target: Workflow.Node.Id,
                targetHandle: Foundations.Input.Id
            }
            if (!sourceHandle || !targetHandle || !sourceNodeId || !targetNodeId) return;

            const edges = s.workflow.data.edges

            if (edges[edgeId])
                return

            const newEdge: Workflow.Edge = {
                id: edgeId,
                source: {
                    nodeId: sourceNodeId,
                    handleId: sourceHandle
                },
                target: {
                    nodeId: targetNodeId,
                    handleId: targetHandle
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
                if(!newLayout)
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
            const fieldValues = s.workflow.data.fieldValues

            if (nodes[deletedNodeId])
                delete nodes[deletedNodeId];

            delete fieldValues[deletedNodeId];

            cacheReducers.deleteNode(s, deletedNodeId);
            layoutReducers.node.remove(s, deletedNodeId);
        },
        createId: createNodeId,
        create: (s, blueprint, position) => {
            s.isDirty = true;
            const nodeId = createNodeId(blueprint.id);

            const newNode: Workflow.Node = {
                id: nodeId,
                // TODO: FIX THIS ASAP
                definitionId: blueprint.id,
                display_name: blueprint.display_name,

                data: {
                    inputs: cloneDeep(blueprint.data.inputs),
                    outputs: cloneDeep(blueprint.data.outputs),
                    ui: {
                        ...blueprint.data.ui,
                        isMinimized: false
                    },
                }
            }

            const result = Workflow.Node.Schema.safeParse(newNode)
            if (!result.success) {
                console.error("WorkbenchSDK: Node schema validation failed:", result.error)
                return;
            }

            s.workflow.data.nodes[nodeId] = newNode;

            layoutReducers.node.add(s, nodeId, position);

            s.workflow.data.fieldValues[nodeId] = {}

            cacheReducers.createNode(s, newNode);
        },
        setMinimized: (s, nodeId, isMinimized) => {
            s.isDirty = true;
            s.workflow.data.nodes[nodeId].data.ui.isMinimized = isMinimized;
        },
        setDisplayName: (s, nodeId, newDisplayName) => {
            s.isDirty = true;
            s.workflow.data.nodes[nodeId].display_name = newDisplayName;
        },
        setDescription: (s, nodeId, newDescription) => {
            s.isDirty = true;
            s.workflow.data.nodes[nodeId].data.ui.description = newDescription;
        }
    } satisfies NodeReducers

    // ════════════════════════════════════════════════════════════════════════════
    // INPUT REDUCERS
    // ════════════════════════════════════════════════════════════════════════════
    const inputReducers = {
        // resetOrder: (s, nodeId, blueprint) => {
        //     const node = s.workflow.data.nodes[nodeId];
        //     if (!node) return

        //     s.isDirty = true;
        //     node.data.inputs = cloneDeep(blueprint.data.inputs)
        //     node.data.outputs = cloneDeep(blueprint.data.outputs);
        //     node.data.ui.normalInputsOrder = cloneDeep(blueprint.data.ui.normalInputsOrder)
        //     node.data.ui.advancedInputsOrder = cloneDeep(blueprint.data.ui.advancedInputsOrder)
        // },
        setValue: (s, nodeId, inputId, value) => {
            s.isDirty = true;
            s.workflow.data.fieldValues[nodeId] ??= {}
            s.workflow.data.fieldValues[nodeId][inputId] = value
        },
        remove: (s, nodeId, inputId) => {
            s.isDirty = true;
            const node = s.workflow.data.nodes[nodeId]
            const fieldValues = s.workflow.data.fieldValues[nodeId];

            cacheReducers.deleteInput(s, nodeId, inputId);

            delete node.data.inputs[inputId];
            delete fieldValues[inputId];
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

            const from = active.containerId; // already known
            const to = over.containerId;

            const activeId = active.id;
            const overId = over?.id ?? null;

            const normal = node.data.ui.normalInputsOrder;
            const advanced = node.data.ui.advancedInputsOrder;

            if (from === "connected" && to === "connected") {
                reorderSubsetInPlace(
                    normal,
                    (id) => s.cache.inputHandlesMap[nodeId]?.[id] != null, // CONNECTED predicate
                    activeId,
                    overId
                );
                return;
            }

            // domain rule: never allow drop into connected drawer
            if (to === "connected") return;

            // leaving connected => disconnect side effect
            if (from === "connected")
                inputReducers.disconnectIfConnected(s, nodeId, activeId);

            if (from === "advanced" && to === "advanced") {
                // simple reorder
                if (!advanced.includes(activeId) || (overId && !advanced.includes(overId))) return;
                node.data.ui.advancedInputsOrder = moveInArray(advanced, advanced.indexOf(activeId), advanced.indexOf(overId!));
                return;
            }

            if (from === "normal" && to === "normal") {
                // still need "disconnected subset only" rule because normalInputsOrder stores BOTH connected+disconnected
                reorderSubsetInPlace(
                    normal,
                    (id) => s.cache.inputHandlesMap[nodeId][id] == null, // disconnected predicate
                    activeId,
                    overId
                );
                return;
            }

            // cross moves (all decided by from/to now)
            if (from === "normal" && to === "advanced") {
                removeInPlace(normal, activeId);
                insertBeforeOrEndInPlace(advanced, activeId, overId);
                return;
            }

            if (from === "advanced" && to === "normal") {
                removeInPlace(advanced, activeId);
                insertBeforeOrEndInPlace(normal, activeId, overId);
                return;
            }

            if (from === "connected" && to === "normal") {
                // after disconnect it “becomes” normal; place among disconnected subset
                reorderSubsetInPlace(
                    normal,
                    (id) => s.cache.inputHandlesMap[nodeId][id] == null,
                    activeId,
                    overId
                );
                return;
            }

            if (from === "connected" && to === "advanced") {
                // after disconnect: move from normal list into advanced
                removeInPlace(normal, activeId);
                insertBeforeOrEndInPlace(advanced, activeId, overId);
                return;
            }
        }
    } satisfies InputReducers

    // ════════════════════════════════════════════════════════════════════════════
    // RUNTIME REDUCERS (Dynamic inputs created at runtime)
    // ════════════════════════════════════════════════════════════════════════════
    const runtimeReducers = {
        input: {
            clear: (s, nodeId, inputId) => {
                s.isDirty = true;
                const node = s.workflow.data.nodes[nodeId]
                const input = node.data.inputs[inputId];

                const registry = input.runtimeSubInputsRegistry;
                if (!registry)
                    return;

                Object.entries(registry).forEach(([_, runtimeItem]) => {
                    inputReducers.remove(s, nodeId, runtimeItem.id);
                    delete registry[runtimeItem.id]
                })
            },
            set: (s, nodeId, inputId, displayNames) => {
                s.isDirty = true;
                const node = s.workflow.data.nodes[nodeId]
                const input = node.data.inputs[inputId];

                input.runtimeSubInputsRegistry ??= {}
                const registry = input.runtimeSubInputsRegistry;

                const toBeAdded: string[] = []

                displayNames.forEach(name => {
                    if ((name in registry) === false) {
                        toBeAdded.push(name)
                    }
                })

                // Remove inputs that are no longer present
                Object.entries(registry).forEach(([_, runtimeItem]) => {
                    if (displayNames.includes(runtimeItem.display_name) === false) {
                        inputReducers.remove(s, nodeId, runtimeItem.id);
                        delete registry[runtimeItem.id]
                    }
                })

                toBeAdded.forEach(displayName => {
                    const runtimeInputId = createRuntimeInputId(inputId, displayName);
                    const runtimeInputSchema = {
                        id: runtimeInputId,
                        parentInputId: inputId,
                        display_name: displayName,
                    }
                    registry[runtimeInputId] = runtimeInputSchema;

                    const runtimeInput = {
                        id: runtimeInputId,
                        variant: "string",
                        langChainDataTypes: ["Message"],
                        required: false,
                        asTool: false,
                        reconcile: false,
                        isRuntime: true,
                        initialValue: "",
                        uiData: {
                            displayName: runtimeInputSchema.display_name,
                        },
                        data: {
                            multiline: false
                        }
                    } satisfies Foundations.Input.String

                    node.data.inputs[runtimeInputSchema.id] = runtimeInput;
                })
            },
            ensure: (s, nodeId, inputId) => {
                const node = s.workflow.data.nodes[nodeId]
                const input = node.data.inputs[inputId];

                if (!input.runtimeSubInputsRegistry) return;

                Object.entries(input.runtimeSubInputsRegistry).forEach(([_, runtimeInputSchema]) => {
                    const runtimeInputId = runtimeInputSchema.id;
                    const runtimeInput = {
                        id: runtimeInputId,
                        variant: "string",
                        langChainDataTypes: ["Message"],
                        required: false,
                        asTool: false,
                        reconcile: false,
                        isRuntime: true,
                        initialValue: "",
                        uiData: {
                            displayName: runtimeInputSchema.display_name,
                        },
                        data: {
                            multiline: false
                        }
                    } satisfies Foundations.Input.String

                    node.data.inputs[runtimeInputSchema.id] = runtimeInput;
                })
            }
        }
    } satisfies RuntimeReducers


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
        executeRuntime: (s) => {
            Object.entries(s.workflow.data.nodes).forEach(([_, node]) => {
                Object.entries(node.data.inputs).forEach(([_, input]) => {
                    runtimeReducers.input.ensure(s, node.id, input.id);
                })
            })
        },
        open: (s, workflow) => {
            s.workflow = workflow;
            s.cache = cacheReducers.createAll(s, workflow);
        },
        close: (s) => {
            s.workflow = cloneDeep(EMPTY_WORKFLOW);
            s.cache = cacheReducers.createAll(s, cloneDeep(EMPTY_WORKFLOW));
        }
    } satisfies WorkflowReducers

    return {
        edge: edgeReducers,
        node: nodeReducers,
        input: inputReducers,
        workflow: workflowReducers,
        runtime: runtimeReducers,
        layout: layoutReducers,
        createNodeId: createNodeId,
        setClickedNodeId: (s, nodeId) => { s.clickedNodeId = nodeId; },
        createEdgeId: (_sourceNodeId, _sourceHandleId, _targetNodeId, _targetHandleId) => {
            return `${_sourceNodeId}|${_sourceHandleId}|${_targetNodeId}|${_targetHandleId}` as Workflow.Edge.Id
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
    deleteInput: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Input.Id) => void
    createAll: (state: WorkbenchSDK.State, workflow: Workflow) => WorkbenchSDK.State["cache"]
}

type EdgeReducers = {
    add: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id, conn: Connection) => void
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
}

type NodeReducers = {
    remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void
    createId: (definitionId: Foundations.NodeDefinition.Id) => Workflow.Node.Id
    create: (state: WorkbenchSDK.State, definitionId: Foundations.NodeDefinition.Id, position: { x: number, y: number }) => void
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
        inputId: Foundations.Input.Id,
        value: any
    ) => void
    disconnectIfConnected: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        inputId: Foundations.Input.Id
    ) => boolean
    // resetOrder: (
    //     state: WorkbenchSDK.State,
    //     nodeId: Workflow.Node.Id,
    //     definition: Foundations.NodeDefinition
    // ) => void,
    changeOrder: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        active: {
            id: Foundations.Input.Id,
            items: Foundations.Input.Id[], // holds the current items where id is from
            containerId: InputContainer      // holds the current container id where the id is from
        },
        over: {
            id: Foundations.Input.Id,
            items: Foundations.Input.Id[],
            containerId: InputContainer
        }
    ) => void,
    remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Input.Id) => void
}

type RuntimeReducers = {
    input: {
        clear: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Input.Id) => void
        set: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Input.Id, displayNames: string[]) => void
        ensure: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Input.Id) => void
    }
}

type WorkflowReducers = {
    setLock: (state: WorkbenchSDK.State, lock: boolean) => void
    executeRuntime: (state: WorkbenchSDK.State) => void
    open: (state: WorkbenchSDK.State, workflow: Workflow) => void
    close: (state: WorkbenchSDK.State) => void
}

export type _WorkbenchSDKReducers = {
    edge: EdgeReducers
    node: NodeReducers,
    input: InputReducers,
    workflow: WorkflowReducers,
    layout: LayoutReducers,
    runtime: RuntimeReducers,
    setClickedNodeId: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id | null) => void
    createNodeId: (definitionId: Foundations.NodeDefinition.Id) => Workflow.Node.Id
    createEdgeId: (
        sourceNodeId: Workflow.Node.Id,
        sourceHandleId: Foundations.Output.Id,
        targetNodeId: Workflow.Node.Id,
        targetHandleId: Foundations.Input.Id
    ) => Workflow.Edge.Id
}