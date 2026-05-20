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
                workflowData: Workflow.Data
            ): Issue.Field | null {
                if (!field.required) return null;

                const value = workflowData.staticValues[nodeId]?.[field.id];

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
                workflowData: Workflow.Data,
                cache: Workflow.Cache,
            ) {
                if (!input.required)
                    return null;

                const hasEdge = !!cache.inputHandlesMap[nodeId]?.[input.id];
                if (hasEdge)
                    return null;

                if (input.variant === "Message" || input.variant === "Text") {
                    const value = workflowData.staticValues[nodeId]?.[input.id];
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
            export function check(node: Workflow.Node, workflowData: Workflow.Data, cache: Workflow.Cache) {
                const nodeIssues: Issue.Node = { fields: {}, inputs: {} }

                let numFieldIssues = 0;
                let numInputIssues = 0;


                for (const field of node.fields) {
                    const fieldIssue = Issue.Field.check(field, node.id, workflowData)
                    if (fieldIssue) {
                        nodeIssues.fields[field.id] = fieldIssue
                        numFieldIssues++;
                    }
                }

                for (const input of node.inputs) {
                    const inputIssue = Issue.Input.check(input, node.id, workflowData, cache)
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

        export interface Workflow_ {
            nodes: Record<Workflow.Node.Id, Issue.Node>
            cycles: Issue.Cycle[]
        }
        export function checkWorkflow(workflowData: Workflow.Data, cycles: Workflow.Node.Id[][], cache: Workflow.Cache) {
            const issues: Issue.Workflow_ = {
                nodes: {},
                cycles: []
            }

            for (const node of Object.values(workflowData.nodes)) {
                const nodeIssues = Node.check(node, workflowData, cache)
                if (nodeIssues)
                    issues.nodes[node.id] = nodeIssues
            }

            for (const cycle of cycles) {
                const cycleIssue = Issue.Cycle.check(cycle, workflowData);
                if (cycleIssue)
                    issues.cycles.push(cycleIssue);
            }

            return issues;
        }

        export interface Cycle {
            nodes: Workflow.Node.Id[]
            type: "cycle_without_route_branching_node" | "cycle_gridlock"
        }
        export namespace Cycle {
            const RouteBranchingNodeTypes = new Set([
                "Core.Routing.IfElse",
                "Core.Routing.Router",
                "Core.Routing.Switch",
            ])

            export function check(cycle: Workflow.Node.Id[], workflowData: Workflow.Data) {

                let hasRouteBranchingNode = false;
                let hasCycleEscapeNode = false;

                cycle.forEach(nodeId => {
                    const node = workflowData.nodes[nodeId];
                    if (!node)
                        throw new Error(`Node ${nodeId} not found in workflow during cycle validation. Cycle: ${cycle.join(" -> ")}`);

                    if (RouteBranchingNodeTypes.has(node.blueprintId))
                        hasRouteBranchingNode = true;

                    const staticValues = workflowData.staticValues[nodeId];
                    const signalDep = staticValues?.["signalDependency" as Foundations.Field.Id];
                    const dataDep   = staticValues?.["dataDependency"   as Foundations.Field.Id];

                    // A node can escape the cycle only if it fires on a partial signal
                    // (OR/XOR) AND does not re-block waiting for all data (dataDep !== AND).
                    if ((signalDep === "OR" || signalDep === "XOR") && dataDep !== "AND")
                        hasCycleEscapeNode = true;
                })

                if (!hasRouteBranchingNode && !hasCycleEscapeNode)
                    return {
                        nodes: cycle,
                        type: "cycle_gridlock" as const,
                    }

                if (!hasRouteBranchingNode)
                    return {
                        nodes: cycle,
                        type: "cycle_without_route_branching_node" as const,
                    }

                return null
            }

            export function checkAll(cycles: Workflow.Node.Id[][], workflowData: Workflow.Data) {
                const issues: Issue.Cycle[] = [];

                cycles.forEach(cycle => {
                    const issue = check(cycle, workflowData);
                    if (!issue)
                        return;

                    issues.push(issue)
                })

                return issues;
            }
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
        if (Port.isUnresolvedLike(sourcePort.variant) && Port.isUnresolvedLike(targetPort.variant))
            return false

        if (sourcePort.variant === "UnresolvedList" && Port.isListLike(targetPort.variant))
            return true

        if (targetPort.variant === "UnresolvedList" && (Port.isScalarLike(sourcePort.variant) || Port.isListLike(sourcePort.variant)))
            return true


        if (sourcePort.variant === "UnresolvedScalar" && Port.isScalarLike(targetPort.variant))
            return true

        if (targetPort.variant === "UnresolvedScalar" && Port.isScalarLike(sourcePort.variant))
            return true


        if (sourcePort.variant === targetPort.variant)
            return true

        if (Port.isScalarLike(sourcePort.variant) && (targetPort.variant === Port.LIST_PROMOTION_MAP[sourcePort.variant]))
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
        export function isValid(conn: Connection, workflowData: Workflow.Data, cache: Workflow.Cache) {

            const sourceNode = workflowData.nodes[conn.source];
            const targetNode = workflowData.nodes[conn.target];

            const sourceHandleId = conn.sourceHandle;
            const targetHandleId = conn.targetHandle;

            if (!sourceNode || !targetNode || !sourceHandleId || !targetHandleId)
                return false;

            if (conn.source === conn.target)
                return false;

            if (doesEdgeAlreadyExist(workflowData, sourceNode.id, sourceHandleId, targetNode.id, targetHandleId))
                return false;

            if (!arePortsCompatible(sourceNode, sourceHandleId, targetNode, targetHandleId))
                return false;

            if (isTargetPortAlreadyConnected(targetNode.id, targetHandleId, cache))
                return false

            return true;
        }
    }

    export function workflowHasIssues(issues: Issue.Workflow_) {
        if(issues.cycles.length > 0)
            return true;

        return Object.values(issues.nodes).some(nodeIssue => {
            return Object.values(nodeIssue.fields).length > 0 || Object.values(nodeIssue.inputs).length > 0
        })
    }
}


function doesEdgeAlreadyExist(
    workflowData: Workflow.Data,
    sourceNodeId: Workflow.Node.Id,
    sourceHandleId: Port.Output.Id,
    targetNodeId: Workflow.Node.Id,
    targetHandleId: Port.Input.Id
) {
    const edgeId = Workflow.Edge.createId(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
    return !!workflowData.edges[edgeId]
}