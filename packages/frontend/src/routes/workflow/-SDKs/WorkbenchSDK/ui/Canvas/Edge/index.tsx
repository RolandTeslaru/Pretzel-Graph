import { memo, useId, useCallback, useRef, useEffect } from 'react';
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

    // Compositor-only dot: bake the bezier into transform keyframes so the GPU moves a
    // once-rasterized quad each frame (no repaint). Rebuilds only when the path changes.
    const dotRef = useRef<SVGCircleElement>(null);
    useEffect(() => {
        const el = dotRef.current;
        if (!el) return;
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', edgePath);
        const len = p.getTotalLength();
        const N = 30;
        const frames = Array.from({ length: N + 1 }, (_, i) => {
            const pt = p.getPointAtLength((i / N) * len);
            return { transform: `translate(${pt.x}px, ${pt.y}px)`, offset: i / N };
        });
        const anim = el.animate(frames, { duration: 3000, iterations: Infinity, easing: 'linear' });
        return () => anim.cancel();
    }, [edgePath]);

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
            <circle
                ref={dotRef}
                r={3}
                fill={displayColor}
                style={{ willChange: 'transform', pointerEvents: 'none' }}
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
            />
        </g>
    );
});

export default CanvasEdge;
