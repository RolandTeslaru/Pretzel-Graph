import AuroraRays from '@/components/AuroraRays/AuroraRays'
import { cn } from '@/utils/styleUtils'
import { AssistantSDK } from '../sdk'

// The aurora backdrop, faded out once the conversation has messages.
const AssistantAurora = () => {
    const hasMessages = AssistantSDK.useStore(s => s.messages.length > 0)

    return (
        <div
            className={cn(
                'pointer-events-none absolute top-0 left-0 w-full h-2/3 z-[-1] -scale-x-100 transition-opacity duration-700',
                hasMessages && 'opacity-0'
            )}
        >
            <AuroraRays />
        </div>
    )
}

export default AssistantAurora
