export type ItemSize = 'default' | 'sm'

export const sizeStyles = {
    default: {
        card: 'p-4',
        folderIcon: 'size-20',
        workflowIcon: 'size-14',
        name: 'text-sm',
        meta: 'text-xs mt-2',
        badge: "sm"
    },
    sm: {
        card: 'w-[90px] h-[90px]',
        folderIcon: 'size-10',
        workflowIcon: 'size-9',
        name: 'text-xs',
        meta: 'text-[10px] mt-1',
        badge: "xs"
    },

} as const
