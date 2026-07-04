import { memo, useId, useCallback, useMemo } from 'react';
import { type EdgeProps, getBezierPath } from '@xyflow/react';
import { WorkbenchSDK } from '../../../sdk';
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk';
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk';
import { resolvePorts } from '../../../utils/resolvePorts';
import CanvasEdgeLabel from './label';

const GLINT_MAX_LEN = 60;   // length on a straight edge
const GLINT_MIN_LEN = 16;   // length on the sharpest bends
const GLINT_OVERSHOOT_TOL = 1.5; // px the rigid streak may lift off the curve

/**
 * Picks a glint streak length from the edge's tightest bend so the rigid streak
 * never visibly overshoots the curve. A chord of length L on a circle of radius R
 * deviates from the arc by ~L²/(8R); we solve that for L given a px tolerance.
 * Pure geometry on the bezier control points — computed once per path, no per-frame cost.
 */
function getGlintLength(edgePath: string): number {
    // getBezierPath => "M sx,sy C c1x,c1y c2x,c2y tx,ty"
    const nums = edgePath.match(/-?\d+(\.\d+)?/g)?.map(Number);
    if (!nums || nums.length < 8) return GLINT_MAX_LEN;
    const [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y] = nums;

    const bez = (a: number, b: number, c: number, d: number, t: number) => {
        const mt = 1 - t;
        return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
    };

    const N = 20;
    let prevX = p0x, prevY = p0y, prevAng = 0, haveAng = false, maxCurv = 0;
    for (let i = 1; i <= N; i++) {
        const t = i / N;
        const x = bez(p0x, p1x, p2x, p3x, t);
        const y = bez(p0y, p1y, p2y, p3y, t);
        const dx = x - prevX, dy = y - prevY;
        const segLen = Math.hypot(dx, dy);
        if (segLen > 0.001) {
            const ang = Math.atan2(dy, dx);
            if (haveAng) {
                let dAng = Math.abs(ang - prevAng);
                if (dAng > Math.PI) dAng = 2 * Math.PI - dAng; // normalize
                maxCurv = Math.max(maxCurv, dAng / segLen); // κ ≈ Δθ/Δs = 1/R
            }
            prevAng = ang;
            haveAng = true;
        }
        prevX = x; prevY = y;
    }

    if (maxCurv <= 0.0001) return GLINT_MAX_LEN; // effectively straight
    // L ≤ sqrt(8 · R · tol) = sqrt(8 · tol / κ)
    const len = Math.sqrt((8 * GLINT_OVERSHOOT_TOL) / maxCurv);
    return Math.max(GLINT_MIN_LEN, Math.min(GLINT_MAX_LEN, len));
}

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

    const glintLen = useMemo(() => getGlintLength(edgePath), [edgePath]);

    const edgeId = id as Workflow.Edge.Id;
    const sourceNodeId = source as Workflow.Node.Id;
    const sourcePortId = sourceHandleId as Foundations.Port.Output.Id;

    const markerId = useId();

    const sourceNode = WorkbenchSDK.useStore(s => s.data.nodes[source as Workflow.Node.Id])

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

    if (!sourceNode) {
        return null;
    }

    // Resolve the source node's outputs inline (not via the useOutputs hook) so this stays after
    // the guard above without violating rules-of-hooks. Reactive through sourceNode, which carries
    // reconciledBlueprintId / addedOutputs / polymorphicResolutions.
    const sourceBlueprint = ShelfSDK.state.blueprints[sourceNode.reconciledBlueprintId ?? sourceNode.blueprintId];
    const output = sourceBlueprint
        && resolvePorts(sourceBlueprint.outputs, sourceNode.addedOutputs, sourceNode.polymorphicResolutions)
            .find(o => o.id === sourcePortId);
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
                glintLen={glintLen}
            />
        </g>
    );
});

export default CanvasEdge;
