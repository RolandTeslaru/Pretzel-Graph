import { Workflow, Foundations, ExecutionSession } from '@vx-agent-editor/shared/domain';
import { Port } from '@vx-agent-editor/shared/domain/Foundations/Port';
import { Field } from '@vx-agent-editor/shared/domain/Foundations/Field';
import type { WorkbenchSDK } from './sdk';

type NodeId = Workflow.Node.Id
type ConditionValue = Field.Condition.Value
type CaseListValue = Field.CaseList.Value

const conditionSelectors = {
    getValue: (s, nodeId, fieldId) =>
        (s.workflow.data.staticValues[nodeId]?.[fieldId] as ConditionValue | undefined) ?? null,
    getRule: (s, nodeId, fieldId, ruleId) => {
        const condition = conditionSelectors.getValue(s, nodeId, fieldId)
        if (!condition) return null
        return condition.rules[ruleId] ?? null
    },
    getGroup: (s, nodeId, fieldId, ruleGroupId) => {
        const condition = conditionSelectors.getValue(s, nodeId, fieldId)
        if (!condition) return null
        return condition.groups[ruleGroupId] ?? null
    },
    getChildKind: (s, nodeId, fieldId, id) => {
        const condition = conditionSelectors.getValue(s, nodeId, fieldId)
        if (!condition) return null
        if (id in condition.rules) return 'rule' as const
        if (id in condition.groups) return 'group' as const
        return null
    },
} as ConditionSelectors

const caseListSelectors = {
    getValue: (s, nodeId, fieldId) =>
        (s.workflow.data.staticValues[nodeId]?.[fieldId] as CaseListValue | undefined) ?? null,
    getEntry: (s, nodeId, fieldId, portId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        if (!caseList) return null
        return caseList.find((entry: Field.CaseList.Entry) => entry.portId === portId) ?? null
    },
    getEntryIndex: (s, nodeId, fieldId, portId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        if (!caseList) return -1
        return caseList.findIndex((entry: Field.CaseList.Entry) => entry.portId === portId)
    },
    getPortIds: (s, nodeId, fieldId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        return caseList?.map((entry: Field.CaseList.Entry) => entry.portId) ?? []
    },
} as CaseListSelectors

export const workbenchSelectors = {
    node: {
        get: (s, nodeId) => s.workflow.data.nodes[nodeId] ?? null,
        hasIssues: (s, nodeId) => {
            const nodeIssues = s.issues.nodes[nodeId];
            if (!nodeIssues)
                return false;

            return (
                Object.entries(nodeIssues.fields).length > 0 ||
                Object.entries(nodeIssues.inputs).length > 0
            );
        },
        isTool: (s, nodeId) => {
            return s.workflow.data.staticValues[nodeId]?.["isConvertedToTool" as Field.Id] === true;
        },
        extractBlueprint: (s, nodeId) => {
            const node = s.workflow.data.nodes[nodeId];
            if (!node) return null;

            return {
                id: node.blueprintId,
                displayName: node.displayName,
                icon: node.icon ?? "",
                accent: node.accent,
                description: node.description ?? "",
                fields: node.fields,
                inputs: node.inputs,
                outputs: node.outputs,
                toolCompatible: node.toolCompatible ?? false,
            } satisfies Foundations.Blueprint
        },
        /**
         * Returns true when a node has no incoming edges.
         */
        isSourceNode: (s, nodeId) => {
            const incomingEdges = s.cache.incomingEdgesMap[nodeId];
            return incomingEdges ? Object.keys(incomingEdges).length === 0 : true;
        },
        /**
         * Returns true when a node has no outgoing edges.
         */
        isSinkNode: (s, nodeId) => {
            const outgoingEdges = s.cache.outgoingEdgesMap[nodeId];
            return outgoingEdges ? Object.keys(outgoingEdges).length === 0 : true;
        },
        /**
         * Returns true when a node has neither incoming nor outgoing edges.
         */
        isIsolatedNode: (s, nodeId) => {
            const incomingEdges = s.cache.incomingEdgesMap[nodeId];
            const outgoingEdges = s.cache.outgoingEdgesMap[nodeId];

            const hasNoIncoming = incomingEdges ? Object.keys(incomingEdges).length === 0 : true;
            const hasNoOutgoing = outgoingEdges ? Object.keys(outgoingEdges).length === 0 : true;

            return hasNoIncoming && hasNoOutgoing;
        },
    },
    field: {
        get: (s, nodeId, fieldId) => {
            const node = s.workflow.data.nodes[nodeId]
            if (!node) return null;

            return node.fields.find(f => f.id === fieldId) ?? null;
        },
        getValue: (s, nodeId, fieldId) => s.workflow.data.staticValues[nodeId]?.[fieldId] ?? null,
        getValues: (s, nodeId) => {
            const staticValues = s.workflow.data.staticValues[nodeId]
            if (!staticValues)
                return {};

            const node = s.workflow.data.nodes[nodeId]
            if (!node) return {};

            const fieldsValues: Record<Field.Id, any> = {}
            node.fields.forEach(field => {
                fieldsValues[field.id] = staticValues[field.id] ?? field.initialValue;
            })

            return fieldsValues;
        },
        condition: conditionSelectors,
        caseList: caseListSelectors,
    },
    input: {
        get: (s, nodeId, inputId) => {
            const node = s.workflow.data.nodes[nodeId]
            if (!node) return null;

            return node.inputs.find(i => i.id === inputId) ?? null;
        },
        hasEdge: (s, nodeId, inputId) => !!s.cache.inputHandlesMap[nodeId][inputId],
        getProjection: (s, nodeId, inputPortId, session) => {
            const edgeId = s.cache.inputHandlesMap[nodeId]?.[inputPortId];
            if (!edgeId) return undefined;

            const edge = s.workflow.data.edges[edgeId];
            if (!edge) return undefined;

            return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Port.Output.Id];
        },
    },
    output: {
        get: (s, nodeId, outputId) => {
            const node = s.workflow.data.nodes[nodeId]
            if (!node) return null;

            return node.outputs.find(o => o.id === outputId) ?? null;
        },
        hasEdge: (s, nodeId, outputId) => !!s.cache.outputHandlesMap[nodeId][outputId],
    },
    port: {
        polymorphism: {
            getSiblings: (s, nodeId, portId) => {
                const node = s.workflow.data.nodes[nodeId];
                let triggerPort;
    
                if (node.inputs.find(port => port.id === portId))
                    triggerPort = node.inputs.find(port => port.id === portId);
                else
                    triggerPort = node.outputs.find(port => port.id === portId);
    
                if (!triggerPort)
                    throw new Error(`Port ${portId} not found`);
    
                if (!Port.isPolymorphic(triggerPort))
                    throw new Error(`Port ${portId} is not dynamic`);
    
                const polymorphicGroupId = triggerPort.polymorphicGroupId
                const siblings = new Set<Port.Input | Port.Output>();
    
                node.inputs.forEach(input => {
                    if (Port.isPolymorphic(input) && input.polymorphicGroupId === polymorphicGroupId)
                        siblings.add(input);
                })
    
                node.outputs.forEach(output => {
                    if (Port.isPolymorphic(output) && output.polymorphicGroupId === polymorphicGroupId)
                        siblings.add(output);
                })
    
                return siblings;
            },
            getResolvedVariantInGroup: (s, nodeId, polymorphicGroupId) => {
                const node = s.workflow.data.nodes[nodeId];
                if (!node) return null;
    
                const allPorts = [...node.inputs, ...node.outputs];
                const port = allPorts.find(port => port.polymorphicGroupId === polymorphicGroupId);
                if (!port) return null;
    
                return port.variant === "Unresolved" ? null : port.variant;
            },
            groupHasEdges: (s, nodeId, polymorphicGroupId) => {
                const node = s.workflow.data.nodes[nodeId];
                const inputHandles = s.cache.inputHandlesMap[nodeId];
                const outputHandles = s.cache.outputHandlesMap[nodeId];
    
                for (const input of node.inputs) {
                    if (Port.isPolymorphic(input) && input.polymorphicGroupId === polymorphicGroupId && inputHandles[input.id])
                        return true;
                }
                for (const output of node.outputs) {
                    if (Port.isPolymorphic(output) && output.polymorphicGroupId === polymorphicGroupId && outputHandles[output.id])
                        return true;
                }
                return false;
            },
        }
    },
    cache: {
        getInputHandleEdge: (s, nodeId, inputId) => s.cache.inputHandlesMap[nodeId][inputId],
        getOutputHandleEdge: (s, nodeId, outputId) => s.cache.outputHandlesMap[nodeId][outputId],
    },
    execution: {
        getNodeIncomingData: (s, nodeId, session) => {
            const node = s.workflow.data.nodes[nodeId];
            if (!node) return null;

            const incoming: Record<Port.Id, Foundations.Projection> = {};
            for (const input of node.inputs) {
                const projection = s.cache.inputHandlesMap[nodeId]?.[input.id]
                    ? (() => {
                        const edgeId = s.cache.inputHandlesMap[nodeId]?.[input.id];
                        if (!edgeId) return undefined;
                        const edge = s.workflow.data.edges[edgeId];
                        if (!edge) return undefined;
                        return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Port.Output.Id];
                    })()
                    : undefined
                if (projection !== undefined)
                    incoming[input.id] = projection;
            }

            return Object.keys(incoming).length > 0 ? incoming : null;
        },
    },
    graph: {
        hasArcBetween: (s, sourceNodeId, targetNodeId) => {
            const outgoingEdges = s.cache.outgoingEdgesMap[sourceNodeId];
            if (!outgoingEdges) return false;
            return !!outgoingEdges[targetNodeId];
        }
    }
} satisfies _WorkBenchSDKSelectors

type ConditionSelectors = {
    getValue: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id) => ConditionValue | null
    getRule: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, ruleId: Field.Condition.Rule.Id) => Field.Condition.Rule | null
    getGroup: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, ruleGroupId: Field.Condition.RuleGroup.Id) => Field.Condition.RuleGroup | null
    getChildKind: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, id: Field.Condition.Rule.Id | Field.Condition.RuleGroup.Id) => 'rule' | 'group' | null
}

type CaseListSelectors = {
    getValue: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id) => CaseListValue | null
    getEntry: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, portId: Port.Output.Id) => Field.CaseList.Entry | null
    getEntryIndex: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, portId: Port.Output.Id) => number
    getPortIds: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id) => Port.Output.Id[]
}

export type _WorkBenchSDKSelectors = {
    node: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Node
        hasIssues: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
        isTool: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
        extractBlueprint: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Foundations.Blueprint | null
        isSourceNode: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
        isSinkNode: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
        isIsolatedNode: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    }
    field: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Field | null
        getValue: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Field.Value | null
        getValues: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Field.Id, any>
        condition: ConditionSelectors
        caseList: CaseListSelectors
    }
    input: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Port.Input | null
        hasEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => boolean
        getProjection: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputPortId: Port.Input.Id, session: ExecutionSession) => Foundations.Projection | undefined
    }
    output: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Port.Output | null
        hasEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => boolean
    }
    port: {
        polymorphism: {
            getSiblings: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Port.Id) => Set<Port.Input | Port.Output>
            getResolvedVariantInGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => Port.Variant | null
            groupHasEdges: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => boolean
        }
    }
    cache: {
        getInputHandleEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Workflow.Edge.Id
        getOutputHandleEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Workflow.Edge.Id
    }
    execution: {
        getNodeIncomingData: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, session: ExecutionSession) => Record<Port.Id, Foundations.Projection> | null
    }
    graph: {
        hasArcBetween: (state: WorkbenchSDK.State, sourceNodeId: Workflow.Node.Id, targetNodeId: Workflow.Node.Id) => boolean
    }
}
