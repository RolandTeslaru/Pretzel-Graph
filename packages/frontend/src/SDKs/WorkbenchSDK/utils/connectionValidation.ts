import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { WorkbenchSDK } from "../sdk";
import type { Connection } from "@xyflow/react";

export const DRAG_EVENTS_CUSTOM_TYPESS = {
  workflowNode: "worklowNode",
  nodeNode: "noteNode",
  "text/plain": "text/plain",
};

export function isSupportedNodeTypes(type: string) {
  return Object.keys(DRAG_EVENTS_CUSTOM_TYPESS).some((key) => key === type);
}

function detectCycle(
  targetId: Workflow.Node.Id,
  sourceId: Workflow.Node.Id,
  outgoersEdgesMap: WorkbenchSDK.State["cache"]["outgoersEdgesMap"]
) {
  if (targetId === sourceId) return true;

  const stack = [targetId];
  const visited = new Set<Workflow.Node.Id>();

  while (stack.length > 0) {
    const currentId = stack.pop()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === sourceId) return true;

    const outgoers = outgoersEdgesMap[currentId];
    if (!outgoers) continue;

    for (const outgoerId in outgoers) {
      stack.push(outgoerId as Workflow.Node.Id);
    }
  }

  return false;
}

function doesEdgeAlreadyExist(
  workflow: Workflow,
  sourceNodeId: Workflow.Node.Id,
  sourceHandleId: Foundations.Port.Output.Id,
  targetNodeId: Workflow.Node.Id,
  targetHandleId: Foundations.Port.Input.Id
) {
  const edgeId = WorkbenchSDK.reducers.createEdgeId(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
  return !!workflow.data.edges[edgeId]
}

function isTargetAlreadyConnected(
  s: WorkbenchSDK.State,
  targetNodeId: Workflow.Node.Id,
  targetHandleId: Foundations.Port.Input.Id
) {
  const edgeId = s.cache.inputHandlesMap[targetNodeId][targetHandleId]
  if (edgeId)
    return true
  return false
}

function areHandlesDataTypesCompatible(
  sourceNode: Workflow.Node,
  sourcePortId: Foundations.Port.Output.Id,
  targetNode: Workflow.Node,
  targetPortId: Foundations.Port.Input.Id
) {
  const sourcePort = sourceNode.outputs.find(o => o.id === sourcePortId);
  const targetPort = targetNode.inputs.find(i => i.id === targetPortId);

  if (!sourcePort || !targetPort)
    return false

  if (sourcePort.variant === targetPort.variant)
    return true

  return false
}

export function isConnectionValid(s: WorkbenchSDK.State, conn: Connection) {
  const workflow = s.workflow

  const sourceNode = workflow.data.nodes[conn.source as Workflow.Node.Id];
  const targetNode = workflow.data.nodes[conn.target as Workflow.Node.Id];

  const sourceHandleId = conn.sourceHandle as Foundations.Port.Output.Id;
  const targetHandleId = conn.targetHandle as Foundations.Port.Input.Id;

  if (!sourceNode || !targetNode || !sourceHandleId || !targetHandleId)
    return false;

  if (conn.source === conn.target)
    return false;

  if (doesEdgeAlreadyExist(workflow, sourceNode.id, sourceHandleId, targetNode.id, targetHandleId))
    return false;

  if (!areHandlesDataTypesCompatible(sourceNode, sourceHandleId, targetNode, targetHandleId))
    return false;

  if (isTargetAlreadyConnected(s, targetNode.id, targetHandleId))
    return false

  const outgoersEdgesMap = s.cache.outgoersEdgesMap
  const hasCycle = detectCycle(
    targetNode.id,
    sourceNode.id,
    outgoersEdgesMap
  )

  if (hasCycle)
    return false

  return true;
}



