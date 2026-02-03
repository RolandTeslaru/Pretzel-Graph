import { Button, DropdownMenu, ScrollArea, Separator } from '@/vx-ui/foundations'
import { useCallback, useMemo, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { Workflow } from '@vx-agent-editor/shared/types';
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
import { SystemIcons } from '@/vx-ui/icons/system';
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk';
import { AnimatePresence, motion } from 'motion/react';


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
        return {
            connectedInputsOrder: node.data.ui.normalInputsOrder
                .filter(_inputId => !!nodeInHandles[_inputId]),
            normalInputsOrder: node.data.ui.normalInputsOrder
                .filter(_inputId => !!!nodeInHandles[_inputId]),
            advancedInputsOrder: node.data.ui.advancedInputsOrder
        }
    }, [nodeInHandles, node.data.ui.normalInputsOrder, node.data.ui.advancedInputsOrder])

    const [activeId, setActiveId] = useState<Workflow.Node.Input.Id | null>(null);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as Workflow.Node.Input.Id);
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
        for (const arr of Object.values(inputArrs)) {
            if (arr.indexOf(activeId) !== -1)
                return node.data.inputs[activeId];
        }

        return null;
    }, [activeId, inputArrs]);



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
                fixed flex flex-col gap-2 z-20 right-5 top-24 bottom-24 w-87.5 bg-card/80 backdrop-blur-lg 
                border border-border pt-2 rounded-2xl shadow-lg shadow-black/30
            `}>
                <div className='flex flex-row gap-2 px-4 relative'>
                    {/* <NodeIcon className='text-primary my-auto h-5 w-5' dataType={node.data.ui.icon as string} /> */}
                    <h4 className='text-primary font-mono font-semibold text-xl'>
                        {node.display_name}
                    </h4>
                    <div className='absolute top-1/2 -translate-y-1/2 right-2'>
                        <OptionsDropdownMenu nodeId={node.id} />
                    </div>
                </div>
                <Separator />
                <p className='px-4 text-muted-foreground text-xs'>
                    {node.data.ui.description}
                </p>
                <Separator />
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
                                <SortableContext
                                    id="normal"
                                    items={inputArrs.normalInputsOrder}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {inputArrs.normalInputsOrder.map(inputId =>
                                        <NodeInputField
                                            key={inputId}
                                            nodeId={node.id}
                                            input={node.data.inputs[inputId] as Workflow.Node.Input}
                                            isConnected={false}
                                        />
                                    )}
                                </SortableContext>
                            </Accordion.Content>
                        </Accordion.Item>
                        <Accordion.Item value='advanced'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Advanced</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-4 bg-background/50'>
                                <SortableContext
                                    id="advanced"
                                    items={inputArrs.advancedInputsOrder}
                                    strategy={verticalListSortingStrategy}

                                >
                                    {inputArrs.advancedInputsOrder.map(inputId => (
                                        <NodeInputField
                                            key={inputId}
                                            nodeId={node.id}
                                            input={node.data.inputs[inputId] as Workflow.Node.Input}
                                            isConnected={false}
                                        />
                                    ))}
                                </SortableContext>
                            </Accordion.Content>
                        </Accordion.Item>
                        <Accordion.Item value='connected'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Connected</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-4 bg-background/50'>
                                <SortableContext
                                    id="connected"
                                    items={inputArrs.connectedInputsOrder}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {inputArrs.connectedInputsOrder.map((inputId, index) => (
                                        <NodeInputField
                                            key={inputId}
                                            nodeId={node.id}
                                            input={node.data.inputs[inputId] as Workflow.Node.Input}
                                            isConnected={true}
                                        />
                                    ))}
                                </SortableContext>
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

const OptionsDropdownMenu = ({ nodeId }: { nodeId: Workflow.Node.Id }) => {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="secondary" size={"icon-xs"} asChild>
                    <SystemIcons.Menu />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <DropdownMenu.Item className='gap-3'
                    onClick={() => {
                        const blueprint = ShelfSDK.state.blueprints[nodeId];
                        if (!blueprint) return;

                        WorkbenchSDK.actions.input.resetOrder(nodeId, blueprint)
                    }}
                >
                    <SystemIcons.RefreshCcw />
                    Reset Order
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}