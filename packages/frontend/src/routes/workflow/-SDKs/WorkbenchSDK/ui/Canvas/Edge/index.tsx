import { memo, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { type EdgeProps, getBezierPath } from '@xyflow/react';
import { WorkbenchSDK } from '../../../sdk';
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk';
import CanvasEdgeLabel from './label';
import { type EdgeColorKey, edgeColor, edgeMarkerId } from './markers';

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

    // Compositor-only dot: bake the bezier into transform keyframes so the GPU moves a
    // once-rasterized quad each frame (no repaint). Rebuilds only when the path changes.
    // Debounced: while the path is moving (node drag) the dot is hidden and no
    // keyframes are built; they rebuild once the path has settled.
    const dotRef = useRef<SVGCircleElement>(null);
    const [settledPath] = useDebounce(edgePath, 150);
    const pathSettled = settledPath === edgePath;

    useEffect(() => {
        const el = dotRef.current;
        if (!el || !pathSettled) return;

        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', settledPath);
        const len = p.getTotalLength();
        const N = 30;
        const frames = Array.from({ length: N + 1 }, (_, i) => {
            const pt = p.getPointAtLength((i / N) * len);
            return { transform: `translate(${pt.x}px, ${pt.y}px)`, offset: i / N };
        });
        // steps(90) over the 3s loop caps the dot at 30 position updates/s.
        // startTime = 0 phase-locks every dot to the document timeline so all
        // dots step on the same ticks and the compositor idles between them.
        const anim = el.animate(frames, { duration: 3000, iterations: Infinity, easing: 'steps(90)' });
        anim.startTime = 0;
        return () => anim.cancel();
    }, [settledPath, pathSettled]);

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

    const isActive = edgeStatus.runCount > 0 && edgeStatus.status !== "idle";
    const isWaiting = edgeStatus.status === "waiting";
    const isPreparing = edgeStatus.status === "preparing";

    const statusKey: EdgeColorKey = isActive
        ? edgeStatus.status === "completed" ? output.variant
        : isPreparing ? output.variant
        : "waiting"
        : output.variant;

    const displayKey: EdgeColorKey = selected
        ? 'selected'
        : sourceErrored ? 'destructive' : statusKey;

    const statusColor = edgeColor(statusKey);
    const displayColor = edgeColor(displayKey);

    const edgeStyle: React.CSSProperties = {
        ...style,
        stroke: displayColor,
        strokeWidth: 1.5,
        strokeDasharray: isWaiting ? "20 12" : isPreparing ? "20 12" : undefined,
        shapeRendering: 'geometricPrecision',
    };

    return (
        <g>
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
                markerEnd={`url(#${edgeMarkerId(displayKey)})`}
                style={edgeStyle}
            />
            <circle
                ref={dotRef}
                r={3}
                fill={displayColor}
                style={{ pointerEvents: 'none', visibility: pathSettled ? undefined : 'hidden' }}
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
