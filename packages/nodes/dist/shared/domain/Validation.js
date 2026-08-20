"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validation = void 0;
const Workflow_1 = require("./Workflow");
const Port_1 = require("./Foundations/Port");
const Field_1 = require("./Foundations/Field");
var Validation;
(function (Validation) {
    let Issue;
    (function (Issue) {
        let Field;
        (function (Field) {
            function check(field, nodeId, workflowData) {
                if (!field.required)
                    return null;
                if (field.variant === "CalendarRange") {
                    const range = Field_1.Field.CalendarRange.Value.safeParse(workflowData.staticValues[nodeId]?.[field.id] ?? field.initialValue);
                    if (!range.success || !range.data.from || !range.data.to)
                        return {
                            field,
                            type: 'missing_value',
                        };
                    return null;
                }
                if (field.variant === "CalendarDateTimeRange") {
                    const range = Field_1.Field.CalendarDateTimeRange.Value.safeParse(workflowData.staticValues[nodeId]?.[field.id] ?? field.initialValue);
                    if (!range.success || !range.data.date || !range.data.startTime || !range.data.endTime)
                        return {
                            field,
                            type: 'missing_value',
                        };
                    return null;
                }
                const value = workflowData.staticValues[nodeId]?.[field.id] ?? field.initialValue;
                if (value === undefined || value === null || value === "")
                    return {
                        field,
                        type: 'missing_value',
                    };
                return null;
            }
            Field.check = check;
        })(Field = Issue.Field || (Issue.Field = {}));
        let Input;
        (function (Input) {
            function check(input, nodeId, workflowData, cache) {
                if (!input.required)
                    return null;
                const hasEdge = !!cache.inputHandlesMap[nodeId]?.[input.id];
                if (hasEdge)
                    return null;
                if (input.variant === "Message" || input.variant === "Text") {
                    const value = workflowData.staticValues[nodeId]?.[input.id] ?? ('initialValue' in input ? input.initialValue : undefined);
                    if (value !== undefined && value !== null && value !== "")
                        return null;
                    return {
                        input,
                        type: 'missing_value_or_connection',
                    };
                }
                return {
                    input,
                    type: 'missing_connection',
                };
            }
            Input.check = check;
        })(Input = Issue.Input || (Issue.Input = {}));
        let Credential;
        (function (Credential) {
            function check(template, nodeId, workflowData) {
                if (template.optional)
                    return null;
                const instanceId = workflowData.credentialInstanceIds[nodeId]?.[template.id];
                if (instanceId)
                    return null;
                return {
                    templateId: template.id,
                    type: 'missing_credential',
                };
            }
            Credential.check = check;
        })(Credential = Issue.Credential || (Issue.Credential = {}));
        let Node;
        (function (Node) {
            function check(node, workflowData, cache) {
                const shape = cache.resolvedShape[node.id];
                if (!shape)
                    throw new Error(`Cannot validate node ${node.id}: resolved shape was not provided.`);
                const nodeIssues = { fields: {}, inputs: {}, credentials: {} };
                let numFieldIssues = 0;
                let numInputIssues = 0;
                let numCredentialIssues = 0;
                for (const field of shape.fields) {
                    const fieldIssue = Issue.Field.check(field, node.id, workflowData);
                    if (fieldIssue) {
                        nodeIssues.fields[field.id] = fieldIssue;
                        numFieldIssues++;
                    }
                }
                for (const input of shape.inputs) {
                    const inputIssue = Issue.Input.check(input, node.id, workflowData, cache);
                    if (inputIssue) {
                        nodeIssues.inputs[input.id] = inputIssue;
                        numInputIssues++;
                    }
                }
                for (const template of shape.credentials) {
                    const credentialIssue = Issue.Credential.check(template, node.id, workflowData);
                    if (credentialIssue) {
                        nodeIssues.credentials[template.id] = credentialIssue;
                        numCredentialIssues++;
                    }
                }
                if (numFieldIssues === 0 && numInputIssues === 0 && numCredentialIssues === 0)
                    return null;
                return nodeIssues;
            }
            Node.check = check;
        })(Node = Issue.Node || (Issue.Node = {}));
        function checkWorkflow(workflowData, cycles, cache) {
            const issues = {
                nodes: {},
                cycles: []
            };
            for (const node of Object.values(workflowData.nodes)) {
                const nodeIssues = Node.check(node, workflowData, cache);
                if (nodeIssues)
                    issues.nodes[node.id] = nodeIssues;
            }
            for (const cycle of cycles) {
                const cycleIssue = Issue.Cycle.check(cycle, workflowData);
                if (cycleIssue)
                    issues.cycles.push(cycleIssue);
            }
            return issues;
        }
        Issue.checkWorkflow = checkWorkflow;
        let Cycle;
        (function (Cycle) {
            const RouteBranchingNodeTypes = new Set([
                "Core.Routing.IfElse",
                "Core.Routing.Router",
                "Core.Routing.Switch",
            ]);
            function check(cycle, workflowData) {
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
                    const signalDep = staticValues?.["signalDependency"] ?? "OR";
                    const dataDep = staticValues?.["dataDependency"] ?? "AND";
                    // A node can escape the cycle only if it fires on a partial signal
                    // (OR/XOR) AND does not re-block waiting for all data (dataDep !== AND).
                    if ((signalDep === "OR" || signalDep === "XOR") && dataDep !== "AND")
                        hasCycleEscapeNode = true;
                });
                if (!hasRouteBranchingNode && !hasCycleEscapeNode)
                    return {
                        nodes: cycle,
                        type: "cycle_gridlock",
                    };
                if (!hasRouteBranchingNode)
                    return {
                        nodes: cycle,
                        type: "cycle_without_route_branching_node",
                    };
                return null;
            }
            Cycle.check = check;
            function checkAll(cycles, workflowData) {
                const issues = [];
                cycles.forEach(cycle => {
                    const issue = check(cycle, workflowData);
                    if (!issue)
                        return;
                    issues.push(issue);
                });
                return issues;
            }
            Cycle.checkAll = checkAll;
        })(Cycle = Issue.Cycle || (Issue.Cycle = {}));
    })(Issue = Validation.Issue || (Validation.Issue = {}));
    function arePortsCompatible(sourcePort, targetPort) {
        // Edge compatibility policy:
        //   - Promotion (scalar → list) is allowed implicitly via LIST_PROMOTION_MAP.
        //   - Demotion (list → scalar) is NEVER allowed at the edge level — use a                                                 
        //     Select node to make element-picking explicit.                                                                       
        //   - Two polymorphic ports cannot connect (no transitive type propagation).                                              
        //   - UnresolvedScalar is strictly scalar-on-both-sides; UnresolvedList accepts                                           
        //     scalar sources via promotion, list sources directly.  
        if (!sourcePort || !targetPort)
            return false;
        // Unresolved ↔ any non-unresolved variant
        if (sourcePort.variant === "Unresolved" && !Port_1.Port.isUnresolvedLike(targetPort.variant))
            return true;
        if (targetPort.variant === "Unresolved" && !Port_1.Port.isUnresolvedLike(sourcePort.variant))
            return true;
        // 2 Unresoled ports are not compatible
        if (Port_1.Port.isUnresolvedLike(sourcePort.variant) && Port_1.Port.isUnresolvedLike(targetPort.variant))
            return false;
        if (sourcePort.variant === "UnresolvedList" && Port_1.Port.isListLike(targetPort.variant))
            return true;
        if (targetPort.variant === "UnresolvedList" && (Port_1.Port.isScalarLike(sourcePort.variant) || Port_1.Port.isListLike(sourcePort.variant)))
            return true;
        if (sourcePort.variant === "UnresolvedScalar" && Port_1.Port.isScalarLike(targetPort.variant))
            return true;
        if (targetPort.variant === "UnresolvedScalar" && Port_1.Port.isScalarLike(sourcePort.variant))
            return true;
        if (sourcePort.variant === targetPort.variant)
            return true;
        if (Port_1.Port.isScalarLike(sourcePort.variant) && (targetPort.variant === Port_1.Port.promoteToList(sourcePort.variant)))
            return true;
        return false;
    }
    Validation.arePortsCompatible = arePortsCompatible;
    function isTargetPortAlreadyConnected(targetNodeId, targetHandleId, cache) {
        const edgeId = cache.inputHandlesMap[targetNodeId][targetHandleId];
        if (edgeId)
            return true;
        return false;
    }
    Validation.isTargetPortAlreadyConnected = isTargetPortAlreadyConnected;
    let Connection;
    (function (Connection) {
        function isValid(conn, workflowData, cache) {
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
            const sourceShape = cache.resolvedShape[sourceNode.id];
            const targetShape = cache.resolvedShape[targetNode.id];
            if (!sourceShape || !targetShape)
                return false;
            const sourcePort = sourceShape.outputs.find(o => o.id === sourceHandleId);
            const targetPort = targetShape.inputs.find(i => i.id === targetHandleId);
            if (!arePortsCompatible(sourcePort, targetPort))
                return false;
            if (isTargetPortAlreadyConnected(targetNode.id, targetHandleId, cache))
                return false;
            return true;
        }
        Connection.isValid = isValid;
    })(Connection = Validation.Connection || (Validation.Connection = {}));
    function workflowHasIssues(issues) {
        if (issues.cycles.length > 0)
            return true;
        return Object.values(issues.nodes).some(nodeIssue => {
            return Object.values(nodeIssue.fields).length > 0 || Object.values(nodeIssue.inputs).length > 0 || Object.values(nodeIssue.credentials).length > 0;
        });
    }
    Validation.workflowHasIssues = workflowHasIssues;
})(Validation || (exports.Validation = Validation = {}));
function doesEdgeAlreadyExist(workflowData, sourceNodeId, sourceHandleId, targetNodeId, targetHandleId) {
    const edgeId = Workflow_1.Workflow.Edge.createId(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
    return workflowData.edges.includes(edgeId);
}
