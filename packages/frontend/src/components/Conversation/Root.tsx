import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { ConversationContext, type Accent } from './context'

interface Props {
    accent:     Accent
    isRunning?: boolean
    // Stops the running reply; the send button turns into a stop button while running.
    onStop?:    () => void
    // Blocks sending without disabling the prompt, e.g. while the workflow has issues.
    isSendBtnDisabled?: boolean
    className?: string
    children?:  ReactNode
}

const Root: React.FC<Props> = ({ accent, isRunning = false, onStop, isSendBtnDisabled = false, className, children }) => {
    const style = {
        "--conversation-accent":            `var(--port-${accent})`,
        "--conversation-accent-foreground": `var(--port-${accent}-foreground)`,
    } as CSSProperties

    return (
        <ConversationContext.Provider value={{ accent, isRunning, onStop, isSendBtnDisabled }}>
            <div className={cn('flex flex-col h-full relative', className)} style={style}>
                {children}
            </div>
        </ConversationContext.Provider>
    )
}

export default Root
