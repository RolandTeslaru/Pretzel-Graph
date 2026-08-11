import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Webhook } from '@pretzel-graph/shared/domain/Webhook'
import { ExecutionSDK } from '../../../../ExecutionSDK/sdk'
import { ConsultationSDK } from '../../../sdk'
import Sonar from './Sonar'

export interface WebhookCardProps extends ConsultationSDK.TemplateProps {
    request: Webhook.Test.Consultation.Request
}

// A webhook node waiting for its first request. Nothing here is answerable by clicking —
// the consultation resolves when a payload actually arrives at the webhook server.
export const WebhookCard = ({ request, ...templateProps }: WebhookCardProps) => {
    return (
        <ConsultationSDK.Template
            {...templateProps}
            className='!bg-card/70 !backdrop-blur-md h-[250px]'
            timeout={{
                createdAt: request.startedAt,
                timeoutMs: request.timeoutMs,
                onExpire:  () => ExecutionSDK.actions.pendingConsultations.remove(request.id),
            }}
        >
            <div className='relative h-full overflow-hidden'>
                <div className='absolute z-10 top-0 left-0 w-full px-4 pt-3'>
                    <p className='font-mono text-[11px] opacity-60'>{request.method} /{request.path}</p>
                </div>

                <div className='absolute top-1/2 left-1/2 -translate-1/2 animate-pulse'>
                    <SystemIcons.Webhook className='text-sky-300 dark:text-sky-400 size-10' />
                    <p className='absolute left-1/2 -translate-x-1/2 text-[11px] font-mono text-sky-400 text-nowrap'>Webhook open</p>
                </div>

                <Sonar className='absolute top-1/2 left-1/2 -translate-1/2 text-cyan-600 dark:text-cyan-400 !w-[400px] !h-[400px] mask-t-from-60% mask-t-to-75%' />
            </div>
        </ConsultationSDK.Template>
    )
}
