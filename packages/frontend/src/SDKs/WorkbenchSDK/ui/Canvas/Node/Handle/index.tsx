import React, { useMemo } from 'react'
import { type Connection, Handle, Position, type Edge } from "@xyflow/react";
import { cn } from '@/utils/styleUtils';
import { Tooltip } from '@/vx-ui/foundations/Tooltip';
import HandleTooltipContent from './tooltip';
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import { isConnectionValid } from '@/SDKs/WorkbenchSDK/utils';
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk';

interface Props {
    type: "target" | "source";
    isWorkflowLocked: boolean
    port: Foundations.Port.Input | Foundations.Port.Output
    nodeId: Workflow.Node.Id
}

const handleStyle: React.CSSProperties = {
    width: "10px",
    height: "10px",
    background: "transparent",
    border: "none",
    zIndex: 50,
};


const isValidConnectionCallback = (conn: Connection | Edge) => {
    const isLocked = WorkbenchSDK.isLocked;

    return isLocked ? false : isConnectionValid(WorkbenchSDK.state, conn as Connection);
}

const NodeHandle: React.FC<Props> = ({ type, isWorkflowLocked, port, nodeId }) => {
    const position = type === "target" ? Position.Left : Position.Right;

    const draggedHandle = WorkbenchSDK.useStore(s => s.draggedHandle)

    const isDraggedHandleCompatible = useMemo(() => {
        if (!draggedHandle)
            return false;

        let conn: Connection;

        if (draggedHandle.handleType === "source")
            conn = {
                source: draggedHandle.nodeId,
                sourceHandle: draggedHandle.field.id,
                target: nodeId,
                targetHandle: port.id
            }
        else
            conn = {
                source: nodeId,
                sourceHandle: port.id,
                target: draggedHandle.nodeId,
                targetHandle: draggedHandle.field.id
            }

        return isConnectionValid(WorkbenchSDK.state, conn)
    }, [draggedHandle])


    const isNullHandle = !isDraggedHandleCompatible && !!draggedHandle

    const centerColor = isNullHandle ? "transparent" : `var(--port-${port.variant}-accent)`;
    const borderColor = isNullHandle ? "var(--border)" : `var(--port-${port.variant})`;
    const glowColor = `var(--port-${port.variant})`;

    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <Handle
                    type={type}
                    position={position}
                    isConnectable={!isWorkflowLocked}
                    style={{
                        ...handleStyle,
                        [type === "target" ? "left" : "right"]: "-6px" // push further out (default is -4/-5px)
                    }}
                    id={port.id}
                    isValidConnection={isValidConnectionCallback}
                    className="group transition-all outline-none"
                    onClick={() => {
                        ShelfSDK.actions.searchFilter.setDataTypes(new Set(port.variant))
                    }}
                >
                    {/* Visual Representation of the Handle */}
                    <div
                        className={cn(
                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 pointer-events-none",
                            // Incompatible handle is smaller and transparent. Compatible/normal is fixed size with thick border.
                            isNullHandle ? "w-3 h-3 border-3" : "w-3 h-3 border-3",
                            // Glow only if hovered OR if actively dragging a compatible connection
                            !isNullHandle && (isDraggedHandleCompatible
                                ? `w-4 h-4 border-white!
                                
                                
                                    shadow-[0_0_8px_2px_var(--tw-ring-color),0_0_20px_4px_var(--tw-ring-color),0_0_40px_8px_var(--tw-ring-color),0_0_60px_10px_var(--tw-ring-color)] 
                                    `
                                : `
                                group-hover:w-4 group-hover:h-4 hover:border-white!
                                    group-hover:shadow-[0_0_8px_2px_var(--tw-ring-color),0_0_20px_4px_var(--tw-ring-color),0_0_40px_8px_var(--tw-ring-color),0_0_60px_10px_var(--tw-ring-color)]`
                            )
                        )}
                        style={{
                            backgroundColor: centerColor, // Light inside
                            borderColor: borderColor,    // Dark/Accent thick border
                            '--tw-ring-color': glowColor // Glow matches border
                        } as React.CSSProperties}
                    />
                </Handle>

            </Tooltip.Trigger>
            <Tooltip.Content side={type === "target" ? "left" : "right"} sideOffset={3}>
                <HandleTooltipContent
                    draggedHandle={draggedHandle}
                    handleType={type}
                    port={port}
                    nodeId={nodeId}
                    isDraggedHandleCompatible={isDraggedHandleCompatible}
                />
            </Tooltip.Content>
        </Tooltip.Root>
    )
}

export default NodeHandle