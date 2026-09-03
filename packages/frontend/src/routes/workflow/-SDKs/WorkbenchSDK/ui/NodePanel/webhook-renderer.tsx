import { type Webhook, type Workflow } from '@pretzel-graph/shared/domain'
import React, { memo, useMemo, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { Button, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { toast } from 'sonner'
import { ExecutionSDK } from '../../../ExecutionSDK/sdk'
import type { LegacyExpressionContext } from '@pretzel-graph/shared/domain/Workbench/Document'

interface Props {
    webhook: Webhook
    nodeId: Workflow.Node.Id
}

const WebhookRenderer: React.FC<Props> = memo(({ webhook, nodeId }) => {

    const session = ExecutionSDK.useStore(s => s.currentExecution?.session);

    const expressionCtx = WorkbenchSDK.useStore(s => s.selectors.node.getLegacyExpressionContext(s, nodeId, session));

    const parsedWebhook = useMemo(() => {
        if (!expressionCtx)
            return webhook;

        const w = { ...webhook } as Webhook;

        w.method = evaluateLegacyExpression(webhook.method, expressionCtx) as string;
        w.path = evaluateLegacyExpression(webhook.path, expressionCtx) as string;
        w.responseMode = evaluateLegacyExpression(webhook.responseMode, expressionCtx) as Webhook.ResponseMode;

        return w;

    }, [webhook, expressionCtx, session])

    const workflowId = WorkbenchSDK.useStore(s => s.workflowId);

    const [tab, setTab] = useState<'test' | 'production'>('test');

    const webhookUrl = useMemo(() => {
        const baseUrl = window.location.origin;
        return tab === 'test'
            ? `${baseUrl}/webhook-test/${workflowId}/${parsedWebhook.path}`
            : `${baseUrl}/webhook/${workflowId}/${parsedWebhook.path}`;
    }, [tab, workflowId, parsedWebhook.path])

    return (
        <div className='flex flex-col relative gap-2'>
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
            <div className='flex flex-row gap-1'>
                <div className='min-w-0 flex-1 my-auto'>
                    <p className='text-[11px] text-muted-foreground truncate'>{webhookUrl}</p>
                </div>
                <Button size='icon-xxs' variant='ghost' className='my-auto' onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied to clipboard'); }}>
                    <SystemIcons.Copy/>
                </Button>
            </div>
        </div>
    )
})

export default WebhookRenderer

const LEGACY_EXPRESSION_PATTERN = /\$\{\{\s*([\s\S]*?)\s*\}\}/;
const LEGACY_CONTEXT_REF_PATTERN = /@([A-Za-z_][A-Za-z0-9_]*)/g;

// Temporary webhook-only bridge until these fields move onto Airlock `$` syntax.
function evaluateLegacyExpression(
    expression: string | undefined,
    context: LegacyExpressionContext,
): unknown {
    if (!expression) return undefined;

    const match = expression.match(LEGACY_EXPRESSION_PATTERN);
    if (!match) return expression;

    const body = match[1];
    const rewritten = body.replace(LEGACY_CONTEXT_REF_PATTERN, '$1');
    const keys = Object.keys(context);
    const values = Object.values(context);

    // eslint-disable-next-line no-new-func
    return new Function(...keys, `return (${rewritten})`)(...values);
}
