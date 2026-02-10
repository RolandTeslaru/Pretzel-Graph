import { Button, DropdownMenu, ScrollArea, Separator } from '@/vx-ui/foundations'
import { useCallback, useMemo, useState, memo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { Foundations, Workflow } from '@vx-agent-editor/shared/types';
import { Accordion } from '@/vx-ui/foundations/accordion';
import NodeInputField, { NodeInputCard } from './nodeInputField';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { _includes } from 'zod/v4/core';
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk';
import { AnimatePresence, motion } from 'motion/react';
import { SystemIcons } from '@/vx-ui/icons';
import { LazyIcon } from '@/vx-ui/icons/LazyIcon';


const InputSidebar = () => {
    const clickedNode = WorkbenchSDK.useStore(s => s.clickedNodeId ? s.workflow.data.nodes[s.clickedNodeId] : null);

    return (
        <AnimatePresence>
            {clickedNode && (
                <Content key="sidebar-content" clickedNode={clickedNode} />
            )}
        </AnimatePresence>
    )
}

export default InputSidebar



const EMPTY_OBJECT = {}

const Content = ({ clickedNode: node }: { clickedNode: Workflow.Node }) => {
    const nodeInHandles = WorkbenchSDK.useStore(s => s.cache.inputHandlesMap[node.id] || EMPTY_OBJECT)


    const inputArrs = useMemo(() => {
        const connectedInputs: Foundations.Input[] = [];
        const normalInputs: Foundations.Input[] = [];
        const advancedInputs: Foundations.Input[] = [];

        node.inputs.forEach(input => {
            if (nodeInHandles[input.id]) {
                connectedInputs.push(input);
            } else if (input.advanced) {
                advancedInputs.push(input);
            } else {
                normalInputs.push(input);
            }
        });

        return {
            connectedInputs,
            normalInputs,
            advancedInputs
        };
    }, [nodeInHandles, node.inputs]);

    const [activeId, setActiveId] = useState<Foundations.Input.Id | null>(null);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as Foundations.Input.Id);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        WorkbenchSDK.actions.input.changeOrder(
            node.id,
            {
                id: active.id,
                // @ts-expect-error
                items: active.data.current.sortable.items,
                // @ts-expect-error
                containerId: active.data.current.sortable.containerId
            } as any,
            {
                id: over.id,
                // @ts-expect-error
                items: over.data.current.sortable.items,
                // @ts-expect-error
                containerId: over.data.current.sortable.containerId
            } as any
        )
    }, [node.id])


    const activeItem = useMemo(() => {
        if (!activeId) return null;
        return node.inputs.find(i => i.id === activeId) ?? null;
    }, [activeId, node.inputs]);



    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`
                overflow-hidden
                fixed flex flex-col z-20 right-5 top-24 bottom-24 w-87.5 bg-card/80 backdrop-blur-lg 
                border border-border pt-2 rounded-2xl shadow-lg shadow-black/30
            `}>
                <div className='flex flex-row gap-2 mb-2 px-4 relative'>
                    <LazyIcon className='text-primary my-auto h-5 w-5' name={node.icon as string} />
                    <h4 className='text-primary font-mono font-semibold text-xl'>
                        {node.displayName}
                    </h4>
                </div>
                <div className='border-t border-b border-border py-2 px-4'>
                    <p className='text-muted-foreground text-xs'>
                        {node.description}
                    </p>
                </div>
                <ScrollArea.Root>
                    <Accordion.Root
                        type="multiple"
                        defaultValue={["inputs"]}
                    >
                        <Accordion.Item value='inputs'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Inputs</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col bg-background/50'>
                                <NodeInputsList
                                    id="normal"
                                    inputs={inputArrs.normalInputs}
                                    nodeId={node.id}
                                />
                            </Accordion.Content>
                        </Accordion.Item>
                        <Accordion.Item value='advanced'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Advanced</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-4 bg-background/50'>
                                <NodeInputsList
                                    id="advanced"
                                    inputs={inputArrs.advancedInputs}
                                    nodeId={node.id}
                                />
                            </Accordion.Content>
                        </Accordion.Item>
                        <Accordion.Item value='connected'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Connected</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-4 bg-background/50'>
                                <NodeInputsList
                                    id="connected"
                                    inputs={inputArrs.connectedInputs}
                                    nodeId={node.id}
                                    isConnected={true}
                                />
                            </Accordion.Content>
                        </Accordion.Item>
                        <Accordion.Item value='json'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>JSON</h4>
                            </Accordion.Trigger>

                        </Accordion.Item>
                    </Accordion.Root>
                </ScrollArea.Root>
            </motion.div>
            <DragOverlay>
                {activeItem ? (
                    <NodeInputCard nodeId={node.id} input={activeItem} isDragging isConnected={!!nodeInHandles[activeItem.id]} />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

const NodeInputsList = memo(({
    id,
    inputs,
    nodeId,
    isConnected = false
}: {
    id: string,
    inputs: Foundations.Input[],
    nodeId: Workflow.Node.Id,
    isConnected?: boolean
}) => {
    const items = useMemo(() => inputs.map(i => i.id), [inputs]);

    return (
        <SortableContext
            id={id}
            items={items}
            strategy={verticalListSortingStrategy}
        >
            {inputs.map(input => (
                <NodeInputField
                    key={input.id}
                    nodeId={nodeId}
                    input={input}
                    isConnected={isConnected}
                />
            ))}
        </SortableContext>
    )
})
