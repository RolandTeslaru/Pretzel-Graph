import { useEffect } from 'react'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Chat } from '@pretzel-graph/shared/domain'
import { ExecutionSDK } from '../../../../ExecutionSDK/sdk'
import { ChatSDK } from '../../../../ChatSDK/sdk'
import type { ConsultationSDK } from '../../../sdk'
import { ConsultationTemplate } from '../../../ui/Template'

export interface ChatMessageCardProps extends ConsultationSDK.TemplateProps {
    request: Chat.Consultation.Request
}

// A chat input waiting for a message; answered by sending one from the chat.
export const ChatMessageCard = ({ request, ...templateProps }: ChatMessageCardProps) => {

    useEffect(() => {
        ChatSDK.actions.ui.focusPrompt()
    }, [request.id])

    return (
        <ConsultationTemplate
            {...templateProps}
            timeout={{
                createdAt: request.startedAt,
                timeoutMs: request.timeoutMs,
                onExpire:  () => ExecutionSDK.actions.pendingConsultations.remove(request.id),
                className: 'text-white dark:text-black',
            }}
        >
            <div className='p-2.5 pr-10 text-white dark:text-black flex items-center gap-2.5'>
                <SystemIcons.MessagesSquare className='size-4 shrink-0 animate-pulse' />

                <div className='flex flex-col gap-0.5'>
                    <div className='text-sm font-semibold'>Chat Input node is waiting</div>
                    <div className='text-xs opacity-70'>
                        <button
                            type='button'
                            className='underline underline-offset-2 cursor-pointer'
                            onClick={ChatSDK.actions.ui.focusPrompt}
                        >
                            Open the Chat Sidebar
                        </button>
                        {' '}and send a message
                    </div>
                </div>
            </div>
        </ConsultationTemplate>
    )
}
