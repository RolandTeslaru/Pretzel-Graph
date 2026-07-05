import { memo, useId, useCallback } from 'react';
import { type EdgeProps, getBezierPath } from '@xyflow/react';
import { WorkbenchSDK } from '../../../sdk';
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk';
import CanvasEdgeLabel from './label';

const CanvasEdge = memo(({
    source,
    sourceHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    id,
    selected,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const edgeId = id as Workflow.Edge.Id;
    const sourceNodeId = source as Workflow.Node.Id;
    const sourcePortId = sourceHandleId as Foundations.Port.Output.Id;

    const markerId = useId();

    const output = WorkbenchSDK.useOutput(sourceNodeId, sourcePortId);

    const [edgeStatus, itemCount, sourceErrored] = ExecutionSDK.useStore(s => [
        s.selectors.getEdgeStatus(s, edgeId),
        s.selectors.getEdgeItemCount(s, sourceNodeId, sourcePortId),
        s.selectors.getNodeStatus(s, sourceNodeId).status === "failed",
    ])

    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        WorkbenchSDK.actions.edge.remove(edgeId);
    }, [edgeId]);

    if (!output) {
        return null;
    }

    const defaultColor = `var(--port-${output.variant})`;
    const isActive = edgeStatus.runCount > 0 && edgeStatus.status !== "idle";
    const isWaiting = edgeStatus.status === "waiting";
    const isPreparing = edgeStatus.status === "preparing";

    const statusColor = isActive
        ? edgeStatus.status === "completed" ? defaultColor
        : isPreparing ? defaultColor
        : "var(--status-waiting)"
        : defaultColor;

    const displayColor = selected
        ? 'var(--secondary-foreground)'
        : sourceErrored ? 'var(--destructive)' : statusColor;

    const edgeStyle: React.CSSProperties = {
        ...style,
        stroke: displayColor,
        strokeWidth: 1.5,
        strokeDasharray: isWaiting ? "20 12" : isPreparing ? "20 12" : undefined,
        shapeRendering: 'geometricPrecision',
    };

    const showGlint = !selected;

    return (
        <g>
            <defs>
                <marker
                    id={markerId}
                    markerWidth="12"
                    markerHeight="12"
                    viewBox="-10 -10 20 20"
                    refX="0"
                    refY="0"
                    orient="auto-start-reverse"
                    markerUnits="strokeWidth"
                >
                    <polyline
                        points="-5,-4 0,0 -5,4 -5,-4"
                        fill={displayColor}
                        stroke={displayColor}
                    />
                </marker>
            </defs>
            {/* Invisible wider path for easier clicking */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="react-flow__edge-interaction"
            />
            <path
                d={edgePath}
                fill="none"
                markerEnd={`url(#${markerId})`}
                style={{
                    ...edgeStyle,
                    animation: (isWaiting || isPreparing) ? `edge-dash-flow 0.6s linear infinite` : undefined,
                }}
            />
            <CanvasEdgeLabel
                selected={selected}
                labelX={labelX}
                labelY={labelY}
                onDelete={handleDelete}
                edgeStatus={edgeStatus}
                outputVariant={output.variant}
                itemCount={itemCount}
                statusColor={statusColor}
                showGlint={showGlint}
                edgePath={edgePath}
                glintColor={displayColor}
            />
        </g>
    );
});

export default CanvasEdge;
