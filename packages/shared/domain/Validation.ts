import { Workflow } from "./Workflow"
import { Port } from "./Foundations/Port"
import { Foundations } from "./Foundations";

type Connection = {
    source: Workflow.Node.Id;
    target: Workflow.Node.Id;
    sourceHandle: Port.Output.Id | null;
    targetHandle: Port.Input.Id | null;
}

export namespace Validation {

    export namespace Issue {
        export interface Field {
            field: Foundations.Field
            type: 'missing_value'
        }
        export namespace Field {
            export function check(
                field: Foundations.Field,
                nodeId: Workflow.Node.Id,
                workflow: Workflow
            ): Issue.Field | null {
                const value = workflow.data.staticValues[nodeId]?.[field.id];

                if (value === undefined || value === null || value === "")
                    return {
                        field,
                        type: 'missing_value' as const,
                    }
                return null;
            }
        }


        export interface Input {
            input: Port.Input
            type: "missing_connection" | "missing_value_or_connection"
        }
        export namespace Input {
            export function check(
                input: Port.Input,
                nodeId: Workflow.Node.Id,
                workflow: Workflow,
                cache: Workflow.Cache,
            ) {
                if (!input.required)
                    return null;

                const hasEdge = !!cache.inputHandlesMap[nodeId]?.[input.id];
                if (hasEdge)
                    return null;

                if (input.variant === "Message" || input.variant === "Text") {
                    const value = workflow.data.staticValues[nodeId]?.[input.id];
                    if (value !== undefined && value !== null && value !== "")
                        return null;

                    return {
                        input,
                        type: 'missing_value_or_connection' as const,
                    }
                }

                return {
                    input,
                    type: 'missing_connection' as const,
                }
            }
        }

        export interface Node {
            fields: Record<Foundations.Field.Id, Issue.Field>;
            inputs: Record<Port.Input.Id, Issue.Input>;
        }
        export namespace Node {
            export function check(node: Workflow.Node, workflow: Workflow, cache: Workflow.Cache) {
                const nodeIssues: Issue.Node = { fields: {}, inputs: {} }

                let numFieldIssues = 0;
                let numInputIssues = 0;


                for (const field of node.fields) {
                    const fieldIssue = Issue.Field.check(field, node.id, workflow)
                    if (fieldIssue) {
                        nodeIssues.fields[field.id] = fieldIssue
                        numFieldIssues++;
                    }
                }

                for (const input of node.inputs) {
                    const inputIssue = Issue.Input.check(input, node.id, workflow, cache)
                    if (inputIssue) {
                        nodeIssues.inputs[input.id] = inputIssue
                        numInputIssues++;
                    }
                }

                if (numFieldIssues === 0 && numInputIssues === 0)
                    return null;

                return nodeIssues;
            }
        }

        export function checkWorkflow(workflow: Workflow, cache: Workflow.Cache) {
            const issues: Record<Workflow.Node.Id, Issue.Node> = {}

            for (const node of Object.values(workflow.data.nodes)) {
                const nodeIssues = Node.check(node, workflow, cache)
                if (nodeIssues)
                    issues[node.id] = nodeIssues
            }

            return issues;
        }
    }


    export function arePortsCompatible(
        sourceNode: Workflow.Node,
        sourcePortId: Port.Output.Id,
        targetNode: Workflow.Node,
        targetPortId: Port.Input.Id
    ) {
        const sourcePort = sourceNode.outputs.find(o => o.id === sourcePortId);
        const targetPort = targetNode.inputs.find(i => i.id === targetPortId);

        // Edge compatibility policy:
        //   - Promotion (scalar → list) is allowed implicitly via LIST_PROMOTION_MAP.
        //   - Demotion (list → scalar) is NEVER allowed at the edge level — use a                                                 
        //     Select node to make element-picking explicit.                                                                       
        //   - Two polymorphic ports cannot connect (no transitive type propagation).                                              
        //   - UnresolvedScalar is strictly scalar-on-both-sides; UnresolvedList accepts                                           
        //     scalar sources via promotion, list sources directly.  

        if (!sourcePort || !targetPort)
            return false


        // Unresolved ↔ any non-unresolved variant
        if (sourcePort.variant === "Unresolved" && !Port.isUnresolvedLike(targetPort.variant))
            return true;
        if (targetPort.variant === "Unresolved" && !Port.isUnresolvedLike(sourcePort.variant))
            return true;

        
        // 2 Unresoled ports are not compatible
        if(Port.isUnresolvedLike(sourcePort.variant) && Port.isUnresolvedLike(targetPort.variant))
            return false

        if(sourcePort.variant === "UnresolvedList" &&  Port.isListLike(targetPort.variant))
            return true

        if(targetPort.variant === "UnresolvedList" && (Port.isScalarLike(sourcePort.variant) || Port.isListLike(sourcePort.variant)))
            return true


        if(sourcePort.variant === "UnresolvedScalar" && Port.isScalarLike(targetPort.variant))
            return true
        
        if(targetPort.variant === "UnresolvedScalar" &&  Port.isScalarLike(sourcePort.variant))
            return true


        if(sourcePort.variant === targetPort.variant)
            return true

        if(Port.isScalarLike(sourcePort.variant) && (targetPort.variant === Port.LIST_PROMOTION_MAP[sourcePort.variant]))
            return true;

        return false
    }

    export function isTargetPortAlreadyConnected(
        targetNodeId: Workflow.Node.Id,
        targetHandleId: Port.Input.Id,
        cache: Workflow.Cache
    ) {
        const edgeId = cache.inputHandlesMap[targetNodeId][targetHandleId]
        if (edgeId)
            return true
        return false
    }


    export namespace Connection {
        export function isValid(conn: Connection, workflow: Workflow, cache: Workflow.Cache) {

            const sourceNode = workflow.data.nodes[conn.source];
            const targetNode = workflow.data.nodes[conn.target];

            const sourceHandleId = conn.sourceHandle;
            const targetHandleId = conn.targetHandle;

            if (!sourceNode || !targetNode || !sourceHandleId || !targetHandleId)
                return false;

            if (conn.source === conn.target)
                return false;

            if (doesEdgeAlreadyExist(workflow, sourceNode.id, sourceHandleId, targetNode.id, targetHandleId))
                return false;

            if (!arePortsCompatible(sourceNode, sourceHandleId, targetNode, targetHandleId))
                return false;

            if (isTargetPortAlreadyConnected(targetNode.id, targetHandleId, cache))
                return false

            return true;
        }
    }


    export namespace Tarjan{

        export function detectStronglyConnectedComponents(
            nodes: Workflow["data"]["nodes"],
            arcsMap: ReturnType<typeof Workflow.deriveArcs>,
            cache: Workflow.Cache
        ){
            const n = Object.keys(nodes).length

            const indexOf: Record<Workflow.Node.Id, number> = {}; 
            const nodeByIndex: Array<Workflow.Node.Id> = [];

            const lowLink: Array<number> = new Array(n) // where index is from the index map and value is the low link value

            const sccs_index: Array<Array<number>> = []
            const sccs_id: Array<Set<Workflow.Node.Id>> = [];

            let curIdx = 0
            
            const stack: Array<number> = [];
            const onStack: Array<boolean> = new Array(n).fill(false);
            
            // Randomly pick any non indexed nodes;
            Object.keys(nodes).forEach(_nodeId => {
                const nodeId = _nodeId as Workflow.Node.Id;
                
                if(indexOf[nodeId] != undefined)
                    return;

                function dfs(nodeId: Workflow.Node.Id){
                    const arcs = arcsMap[nodeId];
    
                    const nodeIdx= curIdx;
    
                    nodeByIndex[curIdx] = nodeId;
                    
                    indexOf[nodeId] = curIdx
                    lowLink[nodeIdx] = nodeIdx // is subject to change when backtracking;
                    stack.push(nodeIdx);
                    onStack[nodeIdx] = true;
            
                    curIdx++;
    
    
                    for (const neighbor of arcs){
                        if(indexOf[neighbor] === undefined){
                            dfs(neighbor);
                            lowLink[nodeIdx] = Math.min(lowLink[nodeIdx], lowLink[indexOf[neighbor]])
                        } else if (onStack[indexOf[neighbor]]){
                            lowLink[nodeIdx] = Math.min(lowLink[nodeIdx], indexOf[neighbor])
                        }
                    }

                    if (lowLink[nodeIdx] === nodeIdx) {                                                       
                        const scc: number[] = [];                                                               
                        const sccIds = new Set<Workflow.Node.Id>();
                        let poppedIdx: number;                                                                  
                        do {                                                                                  
                            poppedIdx = stack.pop()!;                                                           
                            onStack[poppedIdx] = false;                                                       
                            scc.push(poppedIdx);                                                                
                            sccIds.add(nodeByIndex[poppedIdx]);
                        } while (poppedIdx !== nodeIdx);                                                        
                        sccs_index.push(scc);                                                                   
                        sccs_id.push(sccIds);
                    }    
    
                    return lowLink[nodeIdx];
                }

                dfs(nodeId);
            })

            return [indexOf, nodeByIndex, sccs_index, sccs_id];
        }
    }

    // Based on Donald B. Johnson 1975 paper
    // "Finding all the elementary circuits of a directed graph"
    //
    // High-level structure:
    //   1. For each SCC (from Tarjan), build an induced working set of members.
    //   2. Pick a start vertex s from the SCC, run a blocking DFS to enumerate
    //      every elementary cycle that contains s.
    //   3. Remove s from the working set and repeat with the next vertex.
    //   4. The blocking scheme (blocked + blockedMap) prunes branches that
    //      provably cannot lead to a new cycle, giving the O((V+E)(C+1)) bound.
    export namespace Johnson {
        export function getAllCycles(
            arcsMap: ReturnType<typeof Workflow.deriveArcs>,
            sccs_id: Array<Set<Workflow.Node.Id>>
        ): Workflow.Node.Id[][] {
            const cycles: Workflow.Node.Id[][] = [];

            for (const scc of sccs_id) {
                // Trivial SCC (size 1 with no self-loop) cannot contain a cycle.
                if (scc.size === 1) {
                    const only = scc.values().next().value as Workflow.Node.Id;
                    if (!arcsMap[only]?.has(only)) continue;
                    cycles.push([only, only]);
                    continue;
                }

                // Working set: the induced subgraph shrinks as we remove each
                // processed start vertex. Iterating arcs is filtered through this.
                const remaining = new Set(scc);
                const order = [...scc];

                for (const start of order) {
                    if (!remaining.has(start)) continue;

                    const blocked = new Set<Workflow.Node.Id>();
                    const blockedMap = new Map<Workflow.Node.Id, Set<Workflow.Node.Id>>();
                    const pathStack: Workflow.Node.Id[] = [];

                    function unblock(u: Workflow.Node.Id) {
                        blocked.delete(u);
                        const deps = blockedMap.get(u);
                        if (!deps) return;
                        blockedMap.delete(u);
                        for (const w of deps) {
                            if (blocked.has(w)) unblock(w);
                        }
                    }

                    function circuit(v: Workflow.Node.Id): boolean {
                        let foundCycle = false;
                        pathStack.push(v);
                        blocked.add(v);

                        for (const w of arcsMap[v] ?? []) {
                            if (!remaining.has(w)) continue;

                            if (w === start) {
                                // Elementary cycle = current path + back to start.
                                cycles.push([...pathStack, start]);
                                foundCycle = true;
                            } else if (!blocked.has(w)) {
                                if (circuit(w)) foundCycle = true;
                            }
                        }

                        if (foundCycle) {
                            // Any node on a successful path must be unblocked so
                            // later searches from different starts can revisit it.
                            unblock(v);
                        } else {
                            // Defer unblocking: if a neighbor later finds a cycle,
                            // it'll cascade-unblock v via blockedMap.
                            for (const w of arcsMap[v] ?? []) {
                                if (!remaining.has(w)) continue;
                                let deps = blockedMap.get(w);
                                if (!deps) {
                                    deps = new Set();
                                    blockedMap.set(w, deps);
                                }
                                deps.add(v);
                            }
                        }

                        pathStack.pop();
                        return foundCycle;
                    }

                    circuit(start);
                    // Remove start from the induced subgraph so we don't
                    // rediscover the same cycles from a later start vertex.
                    remaining.delete(start);
                }
            }

            return cycles;
        }
    }
}


function doesEdgeAlreadyExist(
    workflow: Workflow,
    sourceNodeId: Workflow.Node.Id,
    sourceHandleId: Port.Output.Id,
    targetNodeId: Workflow.Node.Id,
    targetHandleId: Port.Input.Id
) {
    const edgeId = Workflow.Edge.createId(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
    return !!workflow.data.edges[edgeId]
}