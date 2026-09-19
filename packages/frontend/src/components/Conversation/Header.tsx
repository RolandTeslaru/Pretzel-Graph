import type { ComponentType, ReactNode, SVGProps } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import FloatContainer from '@/components/FloatContainer'

export const Header: React.FC<{ className?: string, children?: ReactNode }> = ({ className, children }) => (
    <div className={cn('flex flex-row gap-2 absolute top-2 w-[calc(100%-16px)] left-2 z-20', className)}>
        {children}
    </div>
)

interface TitleProps {
    icon:        ComponentType<SVGProps<SVGSVGElement>>
    iconClassName?: string
    // Hides the label and leaves only the icon.
    collapsed?:  boolean
    children:    ReactNode
}

export const Title: React.FC<TitleProps> = ({ icon: Icon, iconClassName, collapsed = false, children }) => (
    <div
        className='flex items-center gap-2 px-2 py-1 rounded-full backdrop-blur-sm'
        style={{ backgroundColor: 'color-mix(in srgb, var(--conversation-accent) 25%, transparent)' }}
    >
        <Icon className={cn('my-auto h-4 w-4', iconClassName)} style={{ color: 'var(--conversation-accent-foreground)' }} />
        <AnimatePresence initial={false}>
            {!collapsed && (
                <motion.h4
                    className='text-sm h-auto my-auto truncate font-semibold pr-1'
                    style={{ color: 'var(--conversation-accent-foreground)' }}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                    {children}
                </motion.h4>
            )}
        </AnimatePresence>
    </div>
)

export const Subtitle: React.FC<{ children?: ReactNode }> = ({ children }) => (
    <p className='text-xs h-auto my-auto truncate font-medium'>{children}</p>
)

export const Actions: React.FC<{ className?: string, children?: ReactNode }> = ({ className, children }) => (
    <FloatContainer className={cn('ml-auto h-7.5! backdrop-blur-md', className)}>
        {children}
    </FloatContainer>
)
