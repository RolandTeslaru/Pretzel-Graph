import React, { memo } from 'react';
import { BaseEdge, type EdgeProps, getBezierPath } from '@xyflow/react';

const WorkflowEdge = memo(({
    id,
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

    return (
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
    );
});

export default WorkflowEdge;
