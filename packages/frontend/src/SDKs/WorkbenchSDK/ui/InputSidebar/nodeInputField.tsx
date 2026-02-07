import { Foundations, Workflow } from '@vx-agent-editor/shared/types';
import React, { memo } from 'react'
import { INPUT_FIELD_RENDERER_MAP, InputLabel } from '../InputRenderer';
import { useSortable } from '@dnd-kit/sortable';
import { SystemIcons } from '@/vx-ui/icons';

interface NodeInputCardProps extends React.HTMLAttributes<HTMLDivElement> {
    input: Foundations.Input
    isDragging?: boolean
    listeners?: any
    attributes?: any
    innerRef?: React.Ref<HTMLElement>
    nodeId: Workflow.Node.Id
    isConnected: boolean
}

export const NodeInputCard: React.FC<NodeInputCardProps> = ({ input, isDragging, listeners, attributes, isConnected, innerRef, style, className, nodeId, ...props }) => {
    const Renderer = INPUT_FIELD_RENDERER_MAP[input.variant] ?? INPUT_FIELD_RENDERER_MAP["other"] as React.ElementType;

    return (
        <div
            ref={innerRef}
            className={`${isDragging ? " bg-card backdrop-blur-lg shadow-xl" : ""} relative py-2 flex flex-row gap-2 px-2 ${className ?? ""}`}
            style={{
                zIndex: isDragging ? 999 : undefined,
                ...style
            }}
            {...attributes}
            {...props}
        >
            <div className='w-full pl-1'>
                {isConnected ?
                    <InputLabel input={input} />
                    :
                    <Renderer input={input} nodeId={nodeId} />
                }
            </div>
            <SystemIcons.GripVertical className={`${isDragging ? "cursor-grabbing" : "cursor-grab"} w-[18px] h-[18px] text-muted-foreground ml-auto my-auto `}
                {...listeners}
            />
        </div>
    )
}

const NodeInputField: React.FC<{
    input: Foundations.Input
    nodeId: Workflow.Node.Id
    isConnected: boolean
}> = memo(({ input, nodeId, isConnected }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: input.id });

    const style = {
        transform: transform
            ? `translateX(${transform.x}px) translateY(${transform.y}px)`
            : 'none',
        transition,
        opacity: isDragging ? 0 : 1
    };

    return (
        <NodeInputCard
            input={input}
            nodeId={nodeId}
            innerRef={setNodeRef}
            listeners={listeners}
            attributes={attributes}
            style={style}
            isDragging={isDragging}
            isConnected={isConnected}
        />
    )
})
export default NodeInputField