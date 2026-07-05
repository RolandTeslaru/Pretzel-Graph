import type React from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { Foundations } from '@pretzel-graph/shared/domain';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';

type CanvasEdgeLabelProps = {
    selected?: boolean;
    labelX: number;
    labelY: number;
    onDelete: (e: React.MouseEvent) => void;
    edgeStatus: {
        runCount: number;
    };
    outputVariant: Foundations.Port.Variant;
    itemCount?: number;
    statusColor: string;
    showGlint?: boolean;
    edgePath: string;
    glintColor: string;
};

const CanvasEdgeLabel = ({
    selected,
    labelX,
    labelY,
    onDelete,
    edgeStatus,
    outputVariant,
    itemCount,
    statusColor,
    showGlint,
    edgePath,
    glintColor,
}: CanvasEdgeLabelProps) => {
    return (
        <EdgeLabelRenderer>
            {/* Cheap direction indicator: a triangle that rides the bezier via offset-path
                (offset-distance is a transform on the compositor — no per-frame paint) and
                rotates to point along its direction of travel (output → input). */}
            {showGlint && (
                <div
                    className="animate-edge-glint"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: `8px solid ${glintColor}`,
                        offsetPath: `path('${edgePath}')`,
                        offsetRotate: 'auto',
                        pointerEvents: 'none',
                        willChange: 'offset-distance',
                    }}
                />
            )}
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
                        onClick={onDelete}
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
                    }}
                >
                    {Foundations.Port.isListLike(outputVariant) && itemCount !== undefined && (
                        <span
                            style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                color: statusColor,
                                fontSize: 10,
                                fontWeight: 500,
                                lineHeight: 1,
                                opacity: 0.8,
                                whiteSpace: 'nowrap',
                                marginBottom: 4,
                            }}
                        >
                            {itemCount} items
                        </span>
                    )}
                    <span
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: statusColor,
                            fontSize: 10,
                            fontWeight: 500,
                            lineHeight: 1,
                            opacity: 0.8,
                            whiteSpace: 'nowrap',
                            marginTop: 4,
                        }}
                    >
                        {edgeStatus.runCount === 1 ? '1 run' : edgeStatus.runCount + ' runs'}
                    </span>
                </div>
            )}
        </EdgeLabelRenderer>
    );
};

export default CanvasEdgeLabel;
