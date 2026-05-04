import { Expression, type Webhook, type Workflow } from '@pretzel-graph/shared/domain'
import React, { memo, useMemo, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { Button, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { toast } from 'sonner'
import { ExecutionSDK } from '../../../ExecutionSDK/sdk'

interface Props {
    webhook: Webhook
    nodeId: Workflow.Node.Id
}

const WebhookRenderer: React.FC<Props> = memo(({ webhook, nodeId }) => {

    const session = ExecutionSDK.useStore(s => s.currentExecution?.session);

    const expressionCtx = WorkbenchSDK.useStore(s => s.selectors.node.getExpressionContext(s, nodeId, session));

    const parsedWebhook = useMemo(() => {
        if (!expressionCtx)
            return webhook;

        const w = { ...webhook } as Webhook;

        w.method = Expression.evaluate(webhook.method, expressionCtx) as string;
        w.path = Expression.evaluate(webhook.path, expressionCtx) as string;
        w.responseMode = Expression.evaluate(webhook.responseMode, expressionCtx) as Webhook.ResponseMode;

        return w;

    }, [webhook, expressionCtx, session])

    const workflowId = WorkbenchSDK.useStore(s => s.workflow.id);

    const [tab, setTab] = useState<'test' | 'production'>('test');

    const webhookUrl = useMemo(() => {
        const baseUrl = import.meta.env.VITE_WEBHOOK_URL as string;
        return tab === 'test'
            ? `${baseUrl}/test/${workflowId}/${parsedWebhook.path}`
            : `${baseUrl}/${workflowId}/${parsedWebhook.path}`;
    }, [tab, workflowId, parsedWebhook.path])

    return (
        <div className='flex flex-col relative gap-1'>
            <div className='flex flex-row w-full'>
                <div className='bg-muted-foreground/50 h-auto py-0.5 px-2 rounded-md  my-auto'>
                    <p className='font-bold text-[11px] text-white'>{parsedWebhook.method}</p>
                </div>
                <Tabs.Root value={tab} onValueChange={v => setTab(v as 'test' | 'production')} className='ml-auto'>
                    <Tabs.List size="xxs" variant="accent">
                        <Tabs.Trigger value="test" >
                            Test URL
                        </Tabs.Trigger>
                        <Tabs.Trigger value="production" >
                            Production URL
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs.Root>
            </div>
            <div className='flex flex-row'>
                <div>
                    <p className='text-[11px] text-muted-foreground [overflow-wrap:anywhere]'>{webhookUrl}</p>
                </div>
                <Button size='icon-xs' variant='ghost' className='ml-auto my-auto' onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied to clipboard'); }}>
                    <SystemIcons.Clipboard/>
                </Button>
            </div>
        </div>
    )
})

export default WebhookRenderer
