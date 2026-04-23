'use client'

import {
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ComponentPropsWithoutRef,
    type ComponentRef,
    type ComponentType,
    type DragEvent,
    type HTMLAttributes,
    type ReactNode,
} from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { cva } from 'class-variance-authority'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { SystemIcons } from '../../icons'
import { cn } from '../../utils/cn'

namespace TreeComponents {
    export type DataItem = {
        id: string
        name: string
        icon?: ComponentType<{ className?: string }>
        selectedIcon?: ComponentType<{ className?: string }>
        openIcon?: ComponentType<{ className?: string }>
        children?: DataItem[]
        actions?: ReactNode
        onClick?: () => void
        draggable?: boolean
        droppable?: boolean
        disabled?: boolean
        expanded?: boolean
        className?: string
    }

    export type RenderItemParams = {
        item: DataItem
        level: number
        isLeaf: boolean
        isSelected: boolean
        isOpen?: boolean
        hasChildren: boolean
    }

    export type Root = HTMLAttributes<HTMLDivElement> & {
        data: DataItem[] | DataItem
        initialSelectedItemId?: string
        onSelectChange?: (item: DataItem | undefined) => void
        expandAll?: boolean
        defaultNodeIcon?: ComponentType<{ className?: string }>
        defaultLeafIcon?: ComponentType<{ className?: string }>
        onDocumentDrag?: (sourceItem: DataItem, targetItem: DataItem) => void
        onExpandedChange?: (item: DataItem, isExpanded: boolean) => void
        renderItem?: (params: RenderItemParams) => ReactNode
    }

    export type Item = HTMLAttributes<HTMLDivElement> & {
        data: DataItem[] | DataItem
        level?: number
    }

    export type Node = {
        item: DataItem
        level?: number
    }

    export type Leaf = HTMLAttributes<HTMLDivElement> & {
        item: DataItem
        level: number
    }
}

type TreeContextValue = {
    expandedItemIds: string[]
    defaultNodeIcon?: ComponentType<{ className?: string }>
    defaultLeafIcon?: ComponentType<{ className?: string }>
    renderItem?: (params: TreeComponents.RenderItemParams) => ReactNode
    store: TreeStore
    actions: {
        handleSelectChange: (item: TreeComponents.DataItem | undefined) => void
        handleDragStart: (item: TreeComponents.DataItem) => void
        handleDrop: (item: TreeComponents.DataItem) => void
        handleExpandedChange: (item: TreeComponents.DataItem, isExpanded: boolean) => void
    }
}

type TreeStoreState = {
    selectedItemId?: string
    draggedItem: TreeComponents.DataItem | null
}

type TreeStoreActions = {
    setSelectedItemId: (selectedItemId?: string) => void
    setDraggedItem: (draggedItem: TreeComponents.DataItem | null) => void
}

type TreeStoreSnapshot = TreeStoreState & TreeStoreActions
type TreeStore = ReturnType<typeof createTreeStore>

function createTreeStore(initialSelectedItemId?: string) {
    return createStore<TreeStoreSnapshot>((set) => ({
        selectedItemId: initialSelectedItemId,
        draggedItem: null,
        setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
        setDraggedItem: (draggedItem) => set({ draggedItem }),
    }))
}

const TreeContext = createContext<TreeContextValue | null>(null)

function useTreeContext() {
    const context = useContext(TreeContext)

    if (!context) {
        throw new Error('Tree components must be used within Tree.Root')
    }

    return context
}

function useTreeSelector<T>(selector: (state: TreeStoreSnapshot) => T) {
    const { store } = useTreeContext()
    return useStore(store, selector)
}

const treeVariants = cva(
    'group relative rounded-md px-1.5 hover:bg-accent/50'
)

const selectedTreeVariants = cva(
    'bg-accent/70 text-accent-foreground'
)

const dragOverVariants = cva(
    'bg-primary/20 text-primary-foreground'
)

function normalizeTreeData(data: TreeComponents.DataItem[] | TreeComponents.DataItem) {
    return Array.isArray(data) ? data : [data]
}

function collectExpandedItemIds(
    data: TreeComponents.DataItem[] | TreeComponents.DataItem,
    initialSelectedItemId?: string,
    expandAll?: boolean
) {
    if (!initialSelectedItemId) {
        return [] as string[]
    }

    const ids: string[] = []

    function walk(items: TreeComponents.DataItem[] | TreeComponents.DataItem, targetId: string) {
        if (Array.isArray(items)) {
            for (let i = 0; i < items.length; i++) {
                ids.push(items[i].id)
                if (walk(items[i], targetId) && !expandAll) {
                    return true
                }
                if (!expandAll) {
                    ids.pop()
                }
            }
            return false
        }

        if (!expandAll && items.id === targetId) {
            return true
        }

        if (items.children) {
            return walk(items.children, targetId)
        }

        return false
    }

    walk(data, initialSelectedItemId)
    return ids
}

const Root = forwardRef<HTMLDivElement, TreeComponents.Root>(
    (
        {
            data,
            initialSelectedItemId,
            onSelectChange,
            expandAll,
            defaultLeafIcon,
            defaultNodeIcon,
            className,
            onDocumentDrag,
            onExpandedChange,
            renderItem,
            ...props
        },
        ref
    ) => {
        const [store] = useState(() => createTreeStore(initialSelectedItemId))
        const draggedItem = useStore(store, (snapshot) => snapshot.draggedItem)

        useEffect(() => {
            store.getState().setSelectedItemId(initialSelectedItemId)
        }, [initialSelectedItemId, store])

        const handleSelectChange = useCallback(
            (item: TreeComponents.DataItem | undefined) => {
                store.getState().setSelectedItemId(item?.id)
                onSelectChange?.(item)
            },
            [onSelectChange, store]
        )

        const handleDragStart = useCallback((item: TreeComponents.DataItem) => {
            store.getState().setDraggedItem(item)
        }, [store])

        const handleDrop = useCallback(
            (targetItem: TreeComponents.DataItem) => {
                const draggedItem = store.getState().draggedItem

                if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
                    onDocumentDrag(draggedItem, targetItem)
                }

                store.getState().setDraggedItem(null)
            },
            [onDocumentDrag, store]
        )

        const handleExpandedChange = useCallback(
            (item: TreeComponents.DataItem, isExpanded: boolean) => {
                onExpandedChange?.(item, isExpanded)
            },
            [onExpandedChange]
        )

        const expandedItemIds = useMemo(
            () => collectExpandedItemIds(data, initialSelectedItemId, expandAll),
            [data, expandAll, initialSelectedItemId]
        )

        const contextValue = useMemo<TreeContextValue>(
            () => ({
                expandedItemIds,
                defaultNodeIcon,
                defaultLeafIcon,
                renderItem,
                store,
                actions: {
                    handleSelectChange,
                    handleDragStart,
                    handleDrop,
                    handleExpandedChange,
                },
            }),
            [
                expandedItemIds,
                defaultNodeIcon,
                defaultLeafIcon,
                renderItem,
                store,
                handleSelectChange,
                handleDragStart,
                handleDrop,
                handleExpandedChange,
            ]
        )

        return (
            <TreeContext.Provider value={contextValue}>
                <div className={cn('relative overflow-hidden p-2', className)}>
                    <Item
                        data={data}
                        ref={ref}
                        level={0}
                        {...props}
                    />
                    <div
                        className='h-12 w-full'
                        onDragOver={(event) => {
                            if (!draggedItem) {
                                return
                            }
                            event.preventDefault()
                        }}
                        onDrop={() => {
                            handleDrop({ id: '', name: 'parent_div' })
                        }}
                    />
                </div>
            </TreeContext.Provider>
        )
    }
)
Root.displayName = 'TreeView'

const Item = forwardRef<HTMLDivElement, TreeComponents.Item>(
    (
        {
            className,
            data,
            level,
            ...props
        },
        ref
    ) => {
        const items = normalizeTreeData(data)

        return (
            <div ref={ref} role='tree' className={className} {...props}>
                <ul>
                    {items.map((item) => (
                        <li key={item.id}>
                            {item.children ? (
                                <Node
                                    item={item}
                                    level={level ?? 0}
                                />
                            ) : (
                                <Leaf
                                    item={item}
                                    level={level ?? 0}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        )
    }
)
Item.displayName = 'TreeItem'

function Node({
    item,
    level = 0,
}: TreeComponents.Node) {
    const {
        expandedItemIds,
        defaultNodeIcon,
        renderItem,
        actions,
    } = useTreeContext()

    const isSelected = useTreeSelector((snapshot) => snapshot.selectedItemId === item.id)
    const draggedItemId = useTreeSelector((snapshot) => snapshot.draggedItem?.id)

    const [value, setValue] = useState(
        item.expanded ?? expandedItemIds.includes(item.id) ? [item.id] : []
    )
    const [isDragOver, setIsDragOver] = useState(false)
    const hasChildren = !!item.children?.length
    const isOpen = value.includes(item.id)

    useEffect(() => {
        const nextExpanded = item.expanded ?? expandedItemIds.includes(item.id)
        setValue(nextExpanded ? [item.id] : [])
    }, [expandedItemIds, item.id, item.expanded])

    const onDragStart = (event: DragEvent) => {
        if (!item.draggable || item.disabled) {
            event.preventDefault()
            return
        }

        event.dataTransfer.setData('text/plain', item.id)
        actions.handleDragStart(item)
    }

    const onDragOver = (event: DragEvent) => {
        if (item.disabled) {
            return
        }

        if (item.droppable !== false && draggedItemId && draggedItemId !== item.id) {
            event.preventDefault()
            setIsDragOver(true)
        }
    }

    const onDragLeave = () => {
        setIsDragOver(false)
    }

    const onDrop = (event: DragEvent) => {
        if (item.disabled) {
            return
        }

        event.preventDefault()
        setIsDragOver(false)
        actions.handleDrop(item)
    }

    return (
        <AccordionPrimitive.Root
            type='multiple'
            value={value}
            onValueChange={(nextValue) => {
                setValue(nextValue)
                actions.handleExpandedChange(item, nextValue.includes(item.id))
            }}
        >
            <AccordionPrimitive.Item value={item.id}>
                <AccordionTrigger
                    className={cn(
                        treeVariants(),
                        isSelected && selectedTreeVariants(),
                        isDragOver && dragOverVariants(),
                        item.disabled && 'cursor-not-allowed opacity-50 pointer-events-none',
                        item.className
                    )}
                    onClick={(event) => {
                        if (item.disabled) {
                            return
                        }

                        const target = event.target as HTMLElement | null
                        const clickedChevron = !!target?.closest('[data-tree-chevron="true"]')

                        if (!clickedChevron) {
                            // Keep row click for select/navigation; expansion is chevron-only.
                            event.preventDefault()
                        }

                        actions.handleSelectChange(item)

                        if (!clickedChevron) {
                            item.onClick?.()
                        }
                    }}
                    draggable={!!item.draggable && !item.disabled}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onContextMenu={() => {
                        if (item.disabled) {
                            return
                        }

                        actions.handleSelectChange(item)
                    }}
                >
                    {renderItem ? (
                        renderItem({
                            item,
                            level,
                            isLeaf: false,
                            isSelected,
                            isOpen,
                            hasChildren,
                        })
                    ) : (
                        <>
                            <TreeIcon
                                item={item}
                                isSelected={isSelected}
                                isOpen={isOpen}
                                defaultIcon={defaultNodeIcon}
                            />
                            <span className='truncate text-sm'>{item.name}</span>
                            <TreeActions isSelected={isSelected}>
                                {item.actions}
                            </TreeActions>
                        </>
                    )}
                </AccordionTrigger>
                <AccordionContent className='ml-3.5 border-l border-border/70 pl-2'>
                    <Item
                        data={item.children ? item.children : item}
                        level={level + 1}
                    />
                </AccordionContent>
            </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
    )
}
Node.displayName = 'TreeNode'

const Leaf = forwardRef<HTMLDivElement, TreeComponents.Leaf>(
    (
        {
            className,
            item,
            level,
            ...props
        },
        ref
    ) => {
        const {
            defaultLeafIcon,
            renderItem,
            actions,
        } = useTreeContext()

        const isSelected = useTreeSelector((snapshot) => snapshot.selectedItemId === item.id)
        const draggedItemId = useTreeSelector((snapshot) => snapshot.draggedItem?.id)

        const [isDragOver, setIsDragOver] = useState(false)

        const onDragStart = (event: DragEvent) => {
            if (!item.draggable || item.disabled) {
                event.preventDefault()
                return
            }

            event.dataTransfer.setData('text/plain', item.id)
            actions.handleDragStart(item)
        }

        const onDragOver = (event: DragEvent) => {
            if (item.droppable !== false && !item.disabled && draggedItemId && draggedItemId !== item.id) {
                event.preventDefault()
                setIsDragOver(true)
            }
        }

        const onDragLeave = () => {
            setIsDragOver(false)
        }

        const onDrop = (event: DragEvent) => {
            if (item.disabled) {
                return
            }

            event.preventDefault()
            setIsDragOver(false)
            actions.handleDrop(item)
        }

        return (
            <div
                ref={ref}
                className={cn(
                    'ml-3.5 flex cursor-pointer items-center py-1 text-left',
                    treeVariants(),
                    className,
                    isSelected && selectedTreeVariants(),
                    isDragOver && dragOverVariants(),
                    item.disabled && 'cursor-not-allowed opacity-50 pointer-events-none',
                    item.className
                )}
                onClick={() => {
                    if (item.disabled) {
                        return
                    }

                    actions.handleSelectChange(item)
                    item.onClick?.()
                }}
                draggable={!!item.draggable && !item.disabled}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onContextMenu={() => {
                    if (item.disabled) {
                        return
                    }

                    actions.handleSelectChange(item)
                }}
                {...props}
            >
                {renderItem ? (
                    <>
                        <div className='mr-1 h-4 w-4 shrink-0' />
                        {renderItem({
                            item,
                            level,
                            isLeaf: true,
                            isSelected,
                            hasChildren: false,
                        })}
                    </>
                ) : (
                    <>
                        <TreeIcon
                            item={item}
                            isSelected={isSelected}
                            defaultIcon={defaultLeafIcon}
                        />
                        <span className='grow truncate text-sm'>{item.name}</span>
                        <TreeActions isSelected={isSelected && !item.disabled}>
                            {item.actions}
                        </TreeActions>
                    </>
                )}
            </div>
        )
    }
)
Leaf.displayName = 'TreeLeaf'

const AccordionTrigger = forwardRef<
    ComponentRef<typeof AccordionPrimitive.Trigger>,
    ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger
            ref={ref}
            className={cn(
                'first:[&[data-state=open]>svg]:first-of-type:rotate-90 flex w-full flex-1 items-center py-1 transition-all',
                className
            )}
            {...props}
        >
            <SystemIcons.ChevronRight data-tree-chevron="true" className='mr-1 h-4 w-4 shrink-0 text-accent-foreground/50 transition-transform duration-200' />
            {children}
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = forwardRef<
    ComponentRef<typeof AccordionPrimitive.Content>,
    ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className={cn(
            'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
            className
        )}
        {...props}
    >
        <div className='pb-1 pt-0'>{children}</div>
    </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

function TreeIcon({
    item,
    isOpen,
    isSelected,
    defaultIcon,
}: {
    item: TreeComponents.DataItem
    isOpen?: boolean
    isSelected?: boolean
    defaultIcon?: ComponentType<{ className?: string }>
}) {
    let Icon: ComponentType<{ className?: string }> | undefined = defaultIcon

    if (isSelected && item.selectedIcon) {
        Icon = item.selectedIcon
    } else if (isOpen && item.openIcon) {
        Icon = item.openIcon
    } else if (item.icon) {
        Icon = item.icon
    }

    if (!Icon) {
        return null
    }

    return <Icon className='mr-2 h-4 w-4 shrink-0' />
}

function TreeActions({
    children,
    isSelected,
}: {
    children: ReactNode
    isSelected: boolean
}) {
    return (
        <div
            className={cn(
                isSelected ? 'block' : 'hidden',
                'absolute right-3 group-hover:block'
            )}
        >
            {children}
        </div>
    )
}

export const Tree = {
    Root,
    Item,
    Node,
    Leaf,
    AccordionTrigger,
    AccordionContent,
}

export type TreeDataItem = TreeComponents.DataItem
export type TreeRenderItemParams = TreeComponents.RenderItemParams
