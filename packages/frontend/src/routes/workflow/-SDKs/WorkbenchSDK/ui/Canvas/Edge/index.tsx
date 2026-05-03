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

    const markerId = useId();
    const glintGradientId = useId();

    const sourceNode = WorkbenchSDK.useStore(s => s.workflow.data.nodes[source as Workflow.Node.Id])

    const [edgeStatus, itemCount] = ExecutionSDK.useStore(s => [
        ExecutionSDK.selectors.getEdgeStatus(s, id as Workflow.Edge.Id),
        ExecutionSDK.selectors.getEdgeItemCount(s, source as Workflow.Node.Id, sourceHandleId as Foundations.Port.Output.Id),
    ])

    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        WorkbenchSDK.actions.edge.remove(id as Workflow.Edge.Id);
    }, [id]);

    if (!sourceNode) {
        return null;
    }
    const output = sourceNode.outputs.find(o => o.id === sourceHandleId as Foundations.Port.Output.Id);
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

    const displayColor = selected ? 'var(--secondary-foreground)' : statusColor;

    const edgeStyle: React.CSSProperties = {
        ...style,
        stroke: displayColor,
        strokeWidth: 1.5,
        strokeDasharray: isWaiting ? "20 12" : isPreparing ? "20 12" : undefined,
        shapeRendering: 'geometricPrecision',
    };

    const showGlint = !selected;
    const streakLen = 60;
    const streakThickness = 6;

    return (
        <g>
            <defs>
                <radialGradient id={glintGradientId}>
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="35%" stopColor={displayColor} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={displayColor} stopOpacity="0" />
                </radialGradient>
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
            {showGlint && (
                <ellipse
                    cx={0}
                    cy={0}
                    rx={streakLen / 2}
                    ry={streakThickness / 2}
                    fill={`url(#${glintGradientId})`}
                    opacity={0}
                    style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}
                >
                    <animateMotion
                        dur="3s"
                        repeatCount="indefinite"
                        path={edgePath}
                        rotate="auto"
                    />
                    <animate
                        attributeName="opacity"
                        dur="3s"
                        repeatCount="indefinite"
                        keyTimes="0;0.12;0.88;1"
                        values="0;0.9;0.9;0"
                    />
                    <animate
                        attributeName="rx"
                        dur="3s"
                        repeatCount="indefinite"
                        keyTimes="0;0.2;0.5;0.8;1"
                        values={`0;${streakLen / 2};${streakLen / 2};${streakLen / 2};0`}
                    />
                </ellipse>
            )}
            <CanvasEdgeLabel
                selected={selected}
                labelX={labelX}
                labelY={labelY}
                onDelete={handleDelete}
                edgeStatus={edgeStatus}
                outputVariant={output.variant}
                itemCount={itemCount}
                statusColor={statusColor}
            />
        </g>
    );
});

export default CanvasEdge;
