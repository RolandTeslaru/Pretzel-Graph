import type { LibraryBrowserBaseProps } from ".."

interface Props extends LibraryBrowserBaseProps {
    className?: string
    searchInputClassName?: string
}

export type FileSystemTreeSize = keyof typeof sizeStyles

export const sizeStyles = {
    default: {
        row: 'h-7.5 text-sm',
        indent: 'w-5',
        line: 'left-[7px]',
        radius: 'rounded-bl-lg',
        corner: 'top-[calc(50%-8px)] h-2',
        icon: 'h-4 w-4',
        search: 'sm',
    },
    sm: {
        row: 'h-6 text-xs',
        indent: 'w-4',
        line: 'left-[6px]',
        radius: 'rounded-bl-md',
        corner: 'top-[calc(50%-6px)] h-1.5',
        icon: 'h-3.5 w-3.5',
        search: 'xs',
    },
} as const
