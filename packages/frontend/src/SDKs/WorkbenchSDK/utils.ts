import { Foundations, Workflow } from '@vx-agent-editor/shared/types';
import { WorkbenchSDK } from "./sdk"
import {
  type Connection,
} from "@xyflow/react";

export type InputContainer = "normal" | "connected" | "advanced";

// small helpers
export const removeInPlace = <T,>(arr: T[], item: T) => {
  const idx = arr.indexOf(item);
  if (idx !== -1) arr.splice(idx, 1);
};

export const insertBeforeOrEndInPlace = <T,>(arr: T[], item: T, before: T | null) => {
  removeInPlace(arr, item);
  if (before == null) {
    arr.push(item);
    return;
  }
  const idx = arr.indexOf(before);
  if (idx === -1) arr.push(item);
  else arr.splice(idx, 0, item);
};

export const moveInArray = <T,>(arr: T[], from: number, to: number) => {
  if (from === to || from < 0 || to < 0) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

export const reorderSubsetInPlace = <T,>(
  full: T[],
  predicate: (item: T) => boolean,
  active: T,
  over: T,
) => {
  const subset = full.filter(predicate);
  const from = subset.indexOf(active);
  const to = subset.indexOf(over);
  if (from === -1 || to === -1) return;

  const nextSubset = moveInArray(subset, from, to);

  let i = 0;
  for (let j = 0; j < full.length; j++) {
    if (predicate(full[j])) full[j] = nextSubset[i++]!;
  }
};











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
  sourceHandleId: Foundations.Output.Id,
  targetNodeId: Workflow.Node.Id,
  targetHandleId: Foundations.Input.Id
) {
  const edgeId = WorkbenchSDK.reducers.createEdgeId(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
  return !!workflow.data.edges[edgeId]
}

function isTargetAlreadyConnected(
  s: WorkbenchSDK.State,
  targetNodeId: Workflow.Node.Id,
  targetHandleId: Foundations.Input.Id
) {
  const edgeId = s.cache.inputHandlesMap[targetNodeId][targetHandleId]
  if (edgeId)
    return true
  return false
}

function areHandlesDataTypesCompatible(
  sourceNode: Workflow.Node,
  sourceHandleId: Foundations.Output.Id,
  targetNode: Workflow.Node,
  targetHandleId: Foundations.Input.Id
) {
  const sourceHandle = sourceNode.outputs.find(o => o.id === sourceHandleId);
  const targetHandle = targetNode.inputs.find(i => i.id === targetHandleId);

  if (!sourceHandle || !targetHandle)
    return false

  // Check if any of the source data types are accepted by the target handle
  for (const sourceDataType of Array.from(sourceHandle.handleVariants))
    if (targetHandle.handleVariants.includes(sourceDataType))
      return true

  return false
}

export function isConnectionValid(s: WorkbenchSDK.State, conn: Connection) {
  const workflow = s.workflow

  const sourceNode = workflow.data.nodes[conn.source as Workflow.Node.Id];
  const targetNode = workflow.data.nodes[conn.target as Workflow.Node.Id];

  const sourceHandleId = conn.sourceHandle as Foundations.Output.Id;
  const targetHandleId = conn.targetHandle as Foundations.Input.Id;

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