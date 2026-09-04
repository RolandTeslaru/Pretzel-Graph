import { Workflow as WorkflowD } from "./Workflow"
import { Port } from "./Foundations/Port"
import { Foundations } from "./Foundations";
import { Field as FoundationField } from "./Foundations/Field";
import { Vault } from "./Vault";

type Connection = {
    source: WorkflowD.Node.Id;
    target: WorkflowD.Node.Id;
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
                nodeId: WorkflowD.Node.Id,
                workflowData: WorkflowD.Data
            ): Issue.Field | null {
                if (!field.required) return null;

                if (field.variant === "CalendarRange") {
                    const range = FoundationField.CalendarRange.Value.safeParse(
                        workflowData.staticValues[nodeId]?.[field.id] ?? field.initialValue,
                    );
                    if (!range.success || !range.data.from || !range.data.to)
                        return {
                            field,
                            type: 'missing_value' as const,
                        }
                    return null;
                }

                if (field.variant === "CalendarDateTimeRange") {
                    const range = FoundationField.CalendarDateTimeRange.Value.safeParse(
                        workflowData.staticValues[nodeId]?.[field.id] ?? field.initialValue,
                    );
                    if (!range.success || !range.data.date || !range.data.startTime || !range.data.endTime)
                        return {
                            field,
                            type: 'missing_value' as const,
                        }
                    return null;
                }

                const value = workflowData.staticValues[nodeId]?.[field.id] ?? field.initialValue;

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
                nodeId: WorkflowD.Node.Id,
                workflowData: WorkflowD.Data,
                cache: WorkflowD.Cache,
            ) {
                if (!input.required)
                    return null;

                const hasEdge = !!cache.inputEdgesByPort[nodeId]?.[input.id];
                if (hasEdge)
                    return null;

                if (input.variant === "Message" || input.variant === "Text") {
                    const value = workflowData.staticValues[nodeId]?.[input.id] ?? ('initialValue' in input ? input.initialValue : undefined);
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

        export interface Credential {
            templateId: Vault.Credential.Template.Id
            type: 'missing_credential'
        }
        export namespace Credential {
            export function check(
                template: Vault.Credential.Template,
                nodeId: WorkflowD.Node.Id,
                workflowData: WorkflowD.Data
            ): Issue.Credential | null {
                if (template.optional)
                    return null;

                const instanceId = workflowData.credentialInstanceIds[nodeId]?.[template.id];
                if (instanceId)
                    return null;

                return {
                    templateId: template.id,
                    type: 'missing_credential' as const,
                }
            }
        }

        export interface Node {
            fields: Record<Foundations.Field.Id, Issue.Field>;
            inputs: Record<Port.Input.Id, Issue.Input>;
            credentials: Record<Vault.Credential.Template.Id, Issue.Credential>;
        }
        export namespace Node {
            export function check(
                node: WorkflowD.Node.Raw, 
                workflowData: WorkflowD.Data, 
                cache: WorkflowD.Cache
            ) {
                const shape = cache.resolvedShape[node.id];
                if (!shape)
                    throw new Error(`Cannot validate node ${node.id}: resolved shape was not provided.`);

                const nodeIssues: Issue.Node = { fields: {}, inputs: {}, credentials: {} }

                let numFieldIssues = 0;
                let numInputIssues = 0;
                let numCredentialIssues = 0;


                for (const field of shape.fields) {
                    const fieldIssue = Issue.Field.check(field, node.id, workflowData)
                    if (fieldIssue) {
                        nodeIssues.fields[field.id] = fieldIssue
                        numFieldIssues++;
                    }
                }

                for (const input of shape.inputs) {
                    const inputIssue = Issue.Input.check(input, node.id, workflowData, cache)
                    if (inputIssue) {
                        nodeIssues.inputs[input.id] = inputIssue
                        numInputIssues++;
                    }
                }

                for (const template of shape.credentials) {
                    const credentialIssue = Issue.Credential.check(template, node.id, workflowData)
                    if (credentialIssue) {
                        nodeIssues.credentials[template.id] = credentialIssue
                        numCredentialIssues++;
                    }
                }

                if (numFieldIssues === 0 && numInputIssues === 0 && numCredentialIssues === 0)
                    return null;

                return nodeIssues;
            }
        }

        export interface Workflow {
            nodes: Record<WorkflowD.Node.Id, Issue.Node>
            cycles: Issue.Cycle[]
        }
        export function checkWorkflow(workflowData: WorkflowD.Data, cycles: WorkflowD.Node.Id[][], cache: WorkflowD.Cache) {
            const issues: Issue.Workflow = {
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
            nodes: WorkflowD.Node.Id[]
            type: "cycle_without_route_branching_node" | "cycle_gridlock"
        }
        export namespace Cycle {
            const RouteBranchingNodeTypes = new Set([
                "Core.Routing.IfElse",
                "Core.Routing.Router",
                "Core.Routing.Switch",
            ])

            export function check(cycle: WorkflowD.Node.Id[], workflowData: WorkflowD.Data) {

                let hasRouteBranchingNode = false;
                let hasCycleEscapeNode = false;

                cycle.forEach(nodeId => {
                    const node = workflowData.nodes[nodeId];
                    if (!node)
                        throw new Error(`Node ${nodeId} not found in workflow during cycle validation. Cycle: ${cycle.join(" -> ")}`);

                    if (RouteBranchingNodeTypes.has(node.blueprintId))
                        hasRouteBranchingNode = true;

                    const staticValues = workflowData.staticValues[nodeId];
                    // Fall back to the execution-strategy field defaults (see node-sdk builders) —
                    // un-seeded nodes omit these from staticValues.
                    const signalDep = staticValues?.["signalDependency" as Foundations.Field.Id] ?? "OR";
                    const dataDep   = staticValues?.["dataDependency"   as Foundations.Field.Id] ?? "AND";

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

            export function checkAll(cycles: WorkflowD.Node.Id[][], workflowData: WorkflowD.Data) {
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
        sourcePort: Port.Output | undefined,
        targetPort: Port.Input | undefined,
    ) {
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

        if (Port.isScalarLike(sourcePort.variant) && (targetPort.variant === Port.promoteToList(sourcePort.variant)))
            return true;

        return false
    }

    export function isTargetPortAlreadyConnected(
        targetNodeId: WorkflowD.Node.Id,
        targetHandleId: Port.Input.Id,
        cache: WorkflowD.Cache
    ) {
        const edgeId = cache.inputEdgesByPort[targetNodeId][targetHandleId]
        if (edgeId)
            return true
        return false
    }


    export namespace Connection {
        /** Why a connection cannot be made, or null when it can. The reason is meant to be shown. */
        export function check(conn: Connection, workflowData: WorkflowD.Data, cache: WorkflowD.Cache): string | null {

            const sourceNode = workflowData.nodes[conn.source];
            const targetNode = workflowData.nodes[conn.target];

            const sourceHandleId = conn.sourceHandle;
            const targetHandleId = conn.targetHandle;

            if (!sourceHandleId || !targetHandleId)
                return "Both a source port and a target port are required";

            if (!sourceNode)
                return `Source node ${conn.source} not found`;

            if (!targetNode)
                return `Target node ${conn.target} not found`;

            if (conn.source === conn.target)
                return "A node cannot connect to itself";

            if (doesEdgeAlreadyExist(workflowData, sourceNode.id, sourceHandleId, targetNode.id, targetHandleId))
                return "This edge already exists";

            const sourceShape = cache.resolvedShape[sourceNode.id];
            const targetShape = cache.resolvedShape[targetNode.id];
            if (!sourceShape || !targetShape)
                return "A node's shape could not be resolved";

            const sourcePort = sourceShape.outputs.find(o => o.id === sourceHandleId);
            const targetPort = targetShape.inputs.find(i => i.id === targetHandleId);

            if (!sourcePort)
                return `Output port ${sourceHandleId} not found on ${sourceNode.id}`;

            if (!targetPort)
                return `Input port ${targetHandleId} not found on ${targetNode.id}`;

            if (!arePortsCompatible(sourcePort, targetPort))
                return `Port types do not match: ${sourcePort.variant} cannot feed ${targetPort.variant}`;

            if (isTargetPortAlreadyConnected(targetNode.id, targetHandleId, cache))
                return `Input port ${targetHandleId} on ${targetNode.id} already has an edge; an input takes one`;

            return null;
        }

        export function isValid(conn: Connection, workflowData: WorkflowD.Data, cache: WorkflowD.Cache) {
            return check(conn, workflowData, cache) === null;
        }
    }

    export function workflowHasIssues(issues: Issue.Workflow) {
        if(issues.cycles.length > 0)
            return true;

        return Object.values(issues.nodes).some(nodeIssue => {
            return Object.values(nodeIssue.fields).length > 0 || Object.values(nodeIssue.inputs).length > 0 || Object.values(nodeIssue.credentials).length > 0
        })
    }
}


function doesEdgeAlreadyExist(
    workflowData: WorkflowD.Data,
    sourceNodeId: WorkflowD.Node.Id,
    sourceHandleId: Port.Output.Id,
    targetNodeId: WorkflowD.Node.Id,
    targetHandleId: Port.Input.Id
) {
    const edgeId = WorkflowD.Edge.createId(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
    return workflowData.edges.includes(edgeId)
}
