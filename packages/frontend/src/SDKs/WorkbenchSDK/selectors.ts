import { Workflow, Foundations, ExecutionSession } from '@vx-agent-editor/shared/domain';
import type { WorkbenchSDK } from './sdk';

type NodeId = Workflow.Node.Id
type EdgeId = Workflow.Edge.Id
type ConditionValue = Foundations.Field.Condition.Value
type CaseListValue = Foundations.Field.CaseList.Value

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
        return caseList.find((entry: Foundations.Field.CaseList.Entry) => entry.portId === portId) ?? null
    },
    getEntryIndex: (s, nodeId, fieldId, portId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        if (!caseList) return -1
        return caseList.findIndex((entry: Foundations.Field.CaseList.Entry) => entry.portId === portId)
    },
    getPortIds: (s, nodeId, fieldId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        return caseList?.map((entry: Foundations.Field.CaseList.Entry) => entry.portId) ?? []
    },
} as CaseListSelectors

export const workbenchSelectors = {
    workflow: {
        hasIssues: (s) => Object.entries(s.issues).length > 0,
    },
    node: {
        get: (s, nodeId) => s.workflow.data.nodes[nodeId] ?? null,
        hasIssues: (s, nodeId) => {
            const nodeIssues = s.issues[nodeId];
            if (!nodeIssues)
                return false;

            return (
                Object.entries(nodeIssues.fields).length > 0 ||
                Object.entries(nodeIssues.inputs).length > 0
            );
        },
        isTool: (s, nodeId) => {
            return s.workflow.data.staticValues[nodeId]?.["isConvertedToTool" as Foundations.Field.Id] === true;
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

            const fieldsValues: Record<Foundations.Field.Id, any> = {}
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

            return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Foundations.Port.Output.Id];
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
        getDynamicSiblings: (s, nodeId, portId) => {
            const node = s.workflow.data.nodes[nodeId];
            let triggerPort;

            if (node.inputs.find(port => port.id === portId))
                triggerPort = node.inputs.find(port => port.id === portId);
            else
                triggerPort = node.outputs.find(port => port.id === portId);

            if (!triggerPort)
                throw new Error(`Port ${portId} not found`);

            if (!triggerPort.isDynamic)
                throw new Error(`Port ${portId} is not dynamic`);

            const syncGroupId = triggerPort.syncGroupId
            const siblings = new Set<Foundations.Port.Input | Foundations.Port.Output>();

            node.inputs.forEach(input => {
                if (input.isDynamic && input.syncGroupId === syncGroupId)
                    siblings.add(input);
            })

            node.outputs.forEach(output => {
                if (output.isDynamic && output.syncGroupId === syncGroupId)
                    siblings.add(output);
            })

            return siblings;
        },
        getResolvedVariantInSyncGroup: (s, nodeId, syncGroupId) => {
            const node = s.workflow.data.nodes[nodeId];
            if (!node) return null;

            const allPorts = [...node.inputs, ...node.outputs];
            const portInSyncGroup = allPorts.find(port => port.syncGroupId === syncGroupId);
            if (!portInSyncGroup) return null;

            return portInSyncGroup.variant === "Unresolved" ? null : portInSyncGroup.variant;
        },
        syncGroupHasEdges: (s, nodeId, syncGroupId) => {
            const node = s.workflow.data.nodes[nodeId];
            const inputHandles = s.cache.inputHandlesMap[nodeId];
            const outputHandles = s.cache.outputHandlesMap[nodeId];

            for (const input of node.inputs) {
                if (input.isDynamic && input.syncGroupId === syncGroupId && inputHandles[input.id])
                    return true;
            }
            for (const output of node.outputs) {
                if (output.isDynamic && output.syncGroupId === syncGroupId && outputHandles[output.id])
                    return true;
            }
            return false;
        },
    },
    cache: {
        getInputHandleEdge: (s, nodeId, inputId) => s.cache.inputHandlesMap[nodeId][inputId],
        getOutputHandleEdge: (s, nodeId, outputId) => s.cache.outputHandlesMap[nodeId][outputId],
    },
    execution: {
        getNodeIncomingData: (s, nodeId, session) => {
            const node = s.workflow.data.nodes[nodeId];
            if (!node) return null;

            const incoming: Record<Foundations.Port.Id, Foundations.Projection> = {};
            for (const input of node.inputs) {
                const projection = s.cache.inputHandlesMap[nodeId]?.[input.id]
                    ? (() => {
                        const edgeId = s.cache.inputHandlesMap[nodeId]?.[input.id];
                        if (!edgeId) return undefined;
                        const edge = s.workflow.data.edges[edgeId];
                        if (!edge) return undefined;
                        return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Foundations.Port.Output.Id];
                    })()
                    : undefined
                if (projection !== undefined)
                    incoming[input.id] = projection;
            }

            return Object.keys(incoming).length > 0 ? incoming : null;
        },
    },
} satisfies _WorkBenchSDKSelectors

type ConditionSelectors = {
    getValue: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id) => ConditionValue | null
    getRule: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id, ruleId: Foundations.Field.Condition.Rule.Id) => Foundations.Field.Condition.Rule | null
    getGroup: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id, ruleGroupId: Foundations.Field.Condition.RuleGroup.Id) => Foundations.Field.Condition.RuleGroup | null
    getChildKind: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id, id: Foundations.Field.Condition.Rule.Id | Foundations.Field.Condition.RuleGroup.Id) => 'rule' | 'group' | null
}

type CaseListSelectors = {
    getValue: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id) => CaseListValue | null
    getEntry: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id, portId: Foundations.Port.Output.Id) => Foundations.Field.CaseList.Entry | null
    getEntryIndex: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id, portId: Foundations.Port.Output.Id) => number
    getPortIds: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Foundations.Field.Id) => Foundations.Port.Output.Id[]
}

export type _WorkBenchSDKSelectors = {
    workflow: {
        hasIssues: (state: WorkbenchSDK.State) => boolean
    }
    node: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Node | null
        hasIssues: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
        isTool: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
        extractBlueprint: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Foundations.Blueprint | null
    }
    field: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) => Foundations.Field | null
        getValue: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) => Foundations.Field.Value | null
        getValues: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Foundations.Field.Id, any>
        condition: ConditionSelectors
        caseList: CaseListSelectors
    }
    input: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => Foundations.Port.Input | null
        hasEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => boolean
        getProjection: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputPortId: Foundations.Port.Input.Id, session: ExecutionSession) => Foundations.Projection | undefined
    }
    output: {
        get: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Foundations.Port.Output.Id) => Foundations.Port.Output | null
        hasEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Foundations.Port.Output.Id) => boolean
    }
    port: {
        getDynamicSiblings: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Foundations.Port.Id) => Set<Foundations.Port.Input | Foundations.Port.Output>
        getResolvedVariantInSyncGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, syncGroupId: string) => Foundations.Port.Variant | null
        syncGroupHasEdges: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, syncGroupId: string) => boolean
    }
    cache: {
        getInputHandleEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => Workflow.Edge.Id
        getOutputHandleEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Foundations.Port.Output.Id) => Workflow.Edge.Id
    }
    execution: {
        getNodeIncomingData: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, session: ExecutionSession) => Record<Foundations.Port.Id, Foundations.Projection> | null
    }
}
