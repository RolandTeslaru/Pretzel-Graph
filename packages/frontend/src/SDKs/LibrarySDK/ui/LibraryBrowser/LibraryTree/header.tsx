import type { ReactNode } from 'react'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'

export const Header = ({ className, children }: { className?: string, children: ReactNode }) => (
    <div className={cn('absolute z-10 w-full flex flex-row', className)}>
        {children}
    </div>
)
