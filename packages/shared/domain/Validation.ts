import { Workflow } from "./Workflow"
import { Foundations } from "./Foundations"

type Connection = {
    source: Workflow.Node.Id;
    target: Workflow.Node.Id;
    sourceHandle: Foundations.Port.Output.Id | null;
    targetHandle: Foundations.Port.Input.Id | null;
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
            input: Foundations.Port.Input
            type: "missing_connection" | "missing_value_or_connection"
        }
        export namespace Input {
            export function check(
                input: Foundations.Port.Input,
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
            inputs: Record<Foundations.Port.Input.Id, Issue.Input>;
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
        sourcePortId: Foundations.Port.Output.Id,
        targetNode: Workflow.Node,
        targetPortId: Foundations.Port.Input.Id
    ) {
        const sourcePort = sourceNode.outputs.find(o => o.id === sourcePortId);
        const targetPort = targetNode.inputs.find(i => i.id === targetPortId);

        if (!sourcePort || !targetPort)
            return false

        if(sourcePort.variant !== "Unresolved" && targetPort.variant === "Unresolved")
            return true;
        if(sourcePort.variant === "Unresolved" && targetPort.variant !== "Unresolved")
            return true;

        if (sourcePort.variant === targetPort.variant)
            return true

        return false
    }

    export function isTargetPortAlreadyConnected(
        targetNodeId: Workflow.Node.Id,
        targetHandleId: Foundations.Port.Input.Id,
        cache: Workflow.Cache
    ) {
        const edgeId = cache.inputHandlesMap[targetNodeId][targetHandleId]
        if (edgeId)
            return true
        return false
    }


    export namespace Connection {
        export function detectCycle(
            targetId: Workflow.Node.Id,
            sourceId: Workflow.Node.Id,
            cache: Workflow.Cache
        ) {
            if (targetId === sourceId) return true;

            const stack = [targetId];
            const visited = new Set<Workflow.Node.Id>();

            while (stack.length > 0) {
                const currentId = stack.pop()!;

                if (visited.has(currentId)) continue;
                visited.add(currentId);

                if (currentId === sourceId) return true;

                const outgoers = cache.outgoingEdgesMap[currentId];
                if (!outgoers) continue;

                for (const outgoerId in outgoers) {
                    stack.push(outgoerId as Workflow.Node.Id);
                }
            }

            return false;
        }

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

            // const hasCycle = detectCycle(
            //     targetNode.id,
            //     sourceNode.id,
            //     cache
            // )

            // if (hasCycle)
            //     return false

            return true;
        }
    }
}


function doesEdgeAlreadyExist(
    workflow: Workflow,
    sourceNodeId: Workflow.Node.Id,
    sourceHandleId: Foundations.Port.Output.Id,
    targetNodeId: Workflow.Node.Id,
    targetHandleId: Foundations.Port.Input.Id
) {
    const edgeId = Workflow.Edge.createId(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
    return !!workflow.data.edges[edgeId]
}