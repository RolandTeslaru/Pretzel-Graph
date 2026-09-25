import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { type EdgeProps, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { SettingsSDK } from '@/SDKs/SettingsSDK/sdk';
import { WorkbenchSDK } from '../../../sdk';
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk';
import CanvasEdgeLabel from './label';
import { type EdgeColorKey, edgeColor, edgeMarkerId } from './markers';

const CORNER_RADIUS = 32

const CanvasEdge = memo(({
    source,
    target,
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
    const routingStyle = SettingsSDK.useStore(s => s.edgeStyle);

    // Hybrid keeps edges that run backwards, the ones closing a loop, curved.
    const wantsAngled = routingStyle === 'angled' || (routingStyle === 'hybrid' && targetX >= sourceX);

    // A drop too short for two full corners kinks, so it stays curved.
    const fitsCorners = Math.abs(targetY - sourceY) >= CORNER_RADIUS * 2;

    const isAngled = wantsAngled && fitsCorners;

    const pathParams = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };

    const [edgePath, labelX, labelY] = isAngled
        ? getSmoothStepPath({ ...pathParams, borderRadius: CORNER_RADIUS, offset: 20 })
        : getBezierPath(pathParams);

    const edgeId = id as Workflow.Edge.Id;
    const sourceNodeId = source as Workflow.Node.Id;
    const sourcePortId = sourceHandleId as Foundations.Port.Output.Id;

    // An end still flying in has its handles measured where it started, so the edge would draw
    // to the wrong point for the whole animation. Wait for both ends to land instead.
    const [settleDelay] = useState(() =>
        WorkbenchSDK.animations.settleDelay([sourceNodeId, target as Workflow.Node.Id]));
    const [isHeld, setIsHeld] = useState(settleDelay > 0);

    useEffect(() => {
        if (!isHeld)
            return;

        const timer = window.setTimeout(() => setIsHeld(false), settleDelay);

        return () => window.clearTimeout(timer);
    }, [isHeld, settleDelay]);

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

    if (!output || isHeld) {
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
