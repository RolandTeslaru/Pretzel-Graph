import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import Sonar from './Sonar'
import { TimeoutRing } from '@pretzel-graph/standard-ui/components/TimeoutRing'

const WebhookRequestCard = () => {
    return (
        <div className='relative  overflow-hidden'>
            {/* Header */}
            <div className='absolute top-0 left-0 w-full px-4 pt-3'>
                <p className='font-mono text-xs'>Node ready and awaiting data</p>
                <TimeoutRing className="absolute top-3 right-3" createdAt={Date.now()} timeoutMs={Date.now() + 10} onExpire={() => {}}/>
            </div>
            <div className='absolute top-1/2 left-1/2 -translate-1/2 animate-pulse'>
                <SystemIcons.Webhook className=' text-sky-300 dark:text-sky-400 size-10 '/>
                <p className='absolute left-1/2 -translate-x-1/2 text-[11px] font-mono text-sky-400 text-nowrap'>Webhook open</p>
            </div>
            <Sonar className='absolute top-1/2 left-1/2 -translate-1/2 h-full w-full text-cyan-600 dark:text-cyan-400 !w-[400px] !h-[400px]  mask-t-from-60% mask-t-to-75%' />
        </div>
    )
}

export default WebhookRequestCard
