import type { LibraryBrowserBaseProps } from ".."

interface Props extends LibraryBrowserBaseProps {
    className?: string
    searchInputClassName?: string
}

export type FileSystemTreeSize = keyof typeof sizeStyles

export const sizeStyles = {
    default: {
        row: 'h-7.5 text-sm',
        icon: 'h-4 w-4',
        search: 'sm',
    },
    sm: {
        row: 'h-6 text-xs',
        icon: 'h-3.5 w-3.5',
        search: 'xs',
    },
} as const
