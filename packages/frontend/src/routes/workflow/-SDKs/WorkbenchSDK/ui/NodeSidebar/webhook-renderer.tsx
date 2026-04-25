import { Expression, type Webhook, type Workflow } from '@pretzel-graph/shared/domain'
import React, { memo, useMemo } from 'react'
import { ExecutionSessionSDK } from '../../../ExecutionSessionSDK/sdk'
import { WorkbenchSDK } from '../../sdk'

interface Props {
    webhook: Webhook
    nodeId: Workflow.Node.Id
}

const WebhookRenderer: React.FC<Props> = memo(({ webhook, nodeId }) => {

    const session = ExecutionSessionSDK.useStore(s => s.session);

    const expressionCtx = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.node.getExpressionContext(s, nodeId, session));

    const parsedWebhook = useMemo(() => {
        if (!expressionCtx)
            return webhook;

        const w = {...webhook} as Webhook;

        w.method = Expression.evaluate(webhook.method, expressionCtx) as string;
        w.path = Expression.evaluate(webhook.path, expressionCtx) as string;
        w.responseMode = Expression.evaluate(webhook.responseMode, expressionCtx) as Webhook.ResponseMode;

        return w;

    }, [webhook, expressionCtx, session])

    return (
    <div className='flex flex-row'>
        <div className='bg-muted-foreground/50 h-auto py-0.5 px-2 rounded-md'>
            <p className='font-bold text-[11px] text-white'>{parsedWebhook.method}</p>
        </div>
        <div>
            <p className='text-[11px] text-muted-foreground'>{parsedWebhook.path}</p>
        </div>
    </div>
  )
})

export default WebhookRenderer
