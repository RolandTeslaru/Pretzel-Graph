import React from 'react'
import { ConnectionLineComponentProps } from '@xyflow/react'
import { WorkbenchSDK } from '../../../sdk';

const NodeConnectionLine = ({
    fromX,
    fromY,
    toX,
    toY,
    connectionLineStyle = {},
}: ConnectionLineComponentProps) => {

    // const draggedHandleProps = WorkbenchSDK.useFlow(s => s.draggedHandleProps);

    // const color = draggedHandleProps?.color;
    // const accentColor = `var(--datatype-${color})`;

    // return null
    return (
        <g>
            <path
                fill="none"
                // ! Replace hash # colors here
                strokeWidth={2}
                className={`animated`}
                style={{
                    // stroke: draggedHandleProps ? accentColor : "",
                    ...connectionLineStyle,
                }}
                d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
            />
            <circle
                cx={toX}
                cy={toY}
                fill="#fff"
                r={5}
                // stroke={accentColor}
                className=""
                strokeWidth={1.5}
            />
        </g>
    )
}

export default NodeConnectionLine