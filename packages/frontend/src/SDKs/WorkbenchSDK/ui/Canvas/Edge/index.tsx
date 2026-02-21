import { memo } from 'react';
import { BaseEdge, type EdgeProps, getBezierPath } from '@xyflow/react';
import { WorkbenchSDK } from '../../../sdk';
import { nodeColorsName } from '@/utils/styleUtils';
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";

const WorkflowEdge = memo(({
    source,
    sourceHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const sourceNode = WorkbenchSDK.useStore(s => s.workflow.data.nodes[source as Workflow.Node.Id]);
    if (!sourceNode) {
        return null;
    }
    const output = sourceNode.outputs.find(o => o.id === sourceHandleId as Foundations.Port.Output.Id);
    if (!output) {
        return null;
    }

    const edgeStyle = {
        ...style,
        stroke: `var(--port-${output.variant})`,
        strokeWidth: 1.5
    };

    return (
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
    );
});

export default WorkflowEdge;

