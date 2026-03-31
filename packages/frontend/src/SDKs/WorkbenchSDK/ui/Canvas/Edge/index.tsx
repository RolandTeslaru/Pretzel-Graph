import { memo, useId, useCallback } from 'react';
import { type EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { WorkbenchSDK } from '../../../sdk';
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ExecutionSessionSDK } from '@/SDKs/ExecutionSessionSDK/sdk';
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons';

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

    const sourceNode = WorkbenchSDK.useStore(s => s.workflow.data.nodes[source as Workflow.Node.Id]);
    const edgeStatus = ExecutionSessionSDK.useStore(s => s.session.edge_state[id as Workflow.Edge.Id] ?? { status: "idle", runCount: 0 });

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
        ? edgeStatus.status === "completed" ? "var(--status-success)"
        : isPreparing ? defaultColor
        : "var(--status-waiting)"
        : defaultColor;

    const displayColor = selected ? 'var(--secondary-foreground)' : statusColor;

    const edgeStyle: React.CSSProperties = {
        ...style,
        stroke: displayColor,
        strokeWidth: 2,
        strokeDasharray: isWaiting ? "20 12" : isPreparing ? "20 12" : undefined,
    };

    return (
        <g>
            <defs>
                {(isWaiting || isPreparing) && (
                    <style>{`
                        @keyframes edge-dash-flow-${CSS.escape(id)} {
                            to { stroke-dashoffset: -64; }
                        }
                    `}</style>
                )}
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
                    animation: (isWaiting || isPreparing) ? `edge-dash-flow-${CSS.escape(id)} 0.6s linear infinite` : undefined,
                }}
            />
            <EdgeLabelRenderer>
                {selected && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button
                            className={`flex items-center justify-center w-7 h-7 rounded-sm bg-secondary 
                                hover:bg-destructive text-secondary-foreground hover:text-destructive-foreground 
                                transition-colors cursor-pointer shadow-md border-2 border-secondary-foreground`}
                            
                                onClick={handleDelete}
                        >
                            <SystemIcons.Trash2 size={14} />
                        </button>
                    </div>
                )}
                {edgeStatus.runCount > 0 && !selected && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: 'none',
                            color: statusColor,
                            fontSize: 14,
                            fontWeight: 600,
                            lineHeight: 1,
                            background: 'var(--background)',
                            padding: '2px 5px',
                            borderRadius: 6,
                            border: `2px solid ${statusColor}`,
                        }}
                    >
                        {edgeStatus.runCount}
                    </div>
                )}
            </EdgeLabelRenderer>
        </g>
    );
});

export default WorkflowEdge;
