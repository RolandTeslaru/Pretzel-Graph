import { Workflow, Foundations } from '@vx-agent-editor/shared/domain';
import type { WorkbenchSDK } from './sdk';

export function _createWorkbenchSelectors_() {
    return {
        ensureIngoerEdgesCache: (s, nodeId, sourceId) => {
            if (!s.cache.ingoersEdgesMap[nodeId])
                s.cache.ingoersEdgesMap[nodeId] = {};

            return s.cache.ingoersEdgesMap[nodeId][sourceId];
        },
        ensureOutgoerEdgesCache: (s, nodeId, targetId) => {
            if (!s.cache.outgoersEdgesMap[nodeId])
                s.cache.outgoersEdgesMap[nodeId] = {};

            return s.cache.outgoersEdgesMap[nodeId][targetId];
        },
        ensureInNodesCache: (s, nodeId) => {
            if (!s.cache.ingoersEdgesMap[nodeId])
                s.cache.ingoersEdgesMap[nodeId] = {};

            return s.cache.ingoersEdgesMap[nodeId];
        },
        ensureOutNodesCache: (s, nodeId) => {
            if (!s.cache.outgoersEdgesMap[nodeId])
                s.cache.outgoersEdgesMap[nodeId] = {}

            return s.cache.outgoersEdgesMap[nodeId];
        },
        getInput: (s, nodeId, inputId) => {
            const node = s.workflow.data.nodes[nodeId]
            if (!node) return null;

            const input = node.inputs.find(i => i.id === inputId);
            if (!input) return null;

            return input;
        },
        getOutput: (s, nodeId, outputId) => {
            const node = s.workflow.data.nodes[nodeId]
            if (!node) return null;

            const output = node.outputs.find(o => o.id === outputId);
            if (!output) return null;

            return output;
        },
        ensureInHandlesCache: (s, nodeId, inputId) => {
            return s.cache.inputHandlesMap[nodeId][inputId];
        },
        ensureOutHandlesCache: (s, nodeId, outputId) => {
            return s.cache.outputHandlesMap[nodeId][outputId];
        },
        doesInputhaveEdge: (s, nodeId, inputId) => {
            const edge = s.cache.inputHandlesMap[nodeId][inputId];
            if (edge)
                return true

            return false;
        },
        doesOutputHaveEdge: (s, nodeId, outputId) => {
            const hasEdge = s.cache.outputHandlesMap[nodeId][outputId];
            return !!hasEdge;
        }
    } satisfies _WorkBenchSDKSelectors
}

type NodeId = Workflow.Node.Id
type EdgeId = Workflow.Edge.Id

export type _WorkBenchSDKSelectors = {
    ensureIngoerEdgesCache: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, sourceId: Workflow.Node.Id) => Workflow.Edge.Id;
    ensureOutgoerEdgesCache: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, targetId: Workflow.Node.Id) => Workflow.Edge.Id;

    ensureInNodesCache: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<NodeId, EdgeId>
    ensureOutNodesCache: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<NodeId, EdgeId>

    getInput: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => Foundations.Port.Input | null
    getOutput: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Foundations.Port.Output.Id) => Foundations.Port.Output | null

    ensureInHandlesCache: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => Workflow.Edge.Id
    ensureOutHandlesCache: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Foundations.Port.Output.Id) => Workflow.Edge.Id

    doesInputhaveEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Foundations.Port.Input.Id) => boolean
    doesOutputHaveEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Foundations.Port.Output.Id) => boolean
}