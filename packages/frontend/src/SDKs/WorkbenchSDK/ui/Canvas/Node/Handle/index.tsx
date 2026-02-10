import React, { useMemo } from 'react'
import { type Connection, Handle, Position, type Edge } from "@xyflow/react";
import { cn, nodeColorsName } from '@/utils/styleUtils';
import { Tooltip } from '@/vx-ui/foundations/Tooltip';
import HandleTooltipContent from './tooltip';
import { Foundations, Workflow } from '@vx-agent-editor/shared/types';
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import { isConnectionValid } from '@/SDKs/WorkbenchSDK/utils';
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk';

interface Props {
    type: "target" | "source";
    isWorkflowLocked: boolean
    field: Foundations.Input | Foundations.Output
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

const NodeHandle: React.FC<Props> = ({ type, isWorkflowLocked, field, nodeId }) => {
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
                targetHandle: field.id
            }
        else
            conn = {
                source: nodeId,
                sourceHandle: field.id,
                target: draggedHandle.nodeId,
                targetHandle: draggedHandle.field.id
            }

        return isConnectionValid(WorkbenchSDK.state, conn)
    }, [draggedHandle])

    // Resolve the color name from the data type
    const colorName = useMemo(() => {
        const firstType = field.handleVariants[0] as string
        // Lookup the color name (e.g., "String" -> "blue")
        return nodeColorsName[firstType] || "gray";
    }, [field]);

    // const accentColor÷ =

    const isNullHandle = !isDraggedHandleCompatible && draggedHandle

    const colorVariable = isNullHandle ? "var(--border)" : `var(--datatype-${colorName})`;

    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <Handle
                    type={type}
                    position={position}
                    isConnectable={!isWorkflowLocked}
                    style={handleStyle}
                    id={field.id}
                    isValidConnection={isValidConnectionCallback}
                    className={cn(
                        "group transition-all",
                    )}
                    onClick={() => {
                        ShelfSDK.actions.searchFilter.setDataTypes(new Set(field.handleVariants))
                    }}
                >
                    {/* Visual Representation of the Handle */}
                    <div
                        className={cn(
                            "h-full w-full rounded-full transition-all duration-300",
                        )}
                        style={{
                            backgroundColor: colorVariable,
                            '--tw-ring-color': colorVariable
                        } as React.CSSProperties}
                    />
                </Handle>

            </Tooltip.Trigger>
            <Tooltip.Content side={type === "target" ? "left" : "right"} sideOffset={3}>
                <HandleTooltipContent
                    draggedHandle={draggedHandle}
                    handleType={type}
                    field={field}
                    nodeId={nodeId}
                    isDraggedHandleCompatible={isDraggedHandleCompatible}
                />
            </Tooltip.Content>
        </Tooltip.Root>
    )
}

export default NodeHandle