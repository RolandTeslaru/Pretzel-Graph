import { HumanReview } from '@pretzel-graph/shared/domain'
import { HumanReviewSDK } from '../../HumanReviewSDK/sdk'
import WebhookRequestCard from '../../ExecutionSDK/ui/WebhookRequestCard'
import { InteractionSDK } from '../sdk'

let counter = 0

// Dummy requests are pushed through HumanReviewSDK so the real path runs (data + stack
// entry + countdown ring). Responding hits the API with a fake executionId and will fail —
// use ✕ to dismiss.
const makeRequest = (variant: HumanReview.Request['variant']): HumanReview.Request => {
    const base = {
        id:          crypto.randomUUID(),
        nodeId:      `debug-node-${counter++}`,
        executionId: crypto.randomUUID(),
        createdAt:   Date.now(),
        timeoutMs:   60_000,
    }

    if (variant === 'confirm')
        return HumanReview.Request.Schema.parse({
            ...base,
            variant:  'confirm',
            title:    'Deploy to production?',
            message:  'The agent wants to deploy build #4821.',
        })

    if (variant === 'choice')
        return HumanReview.Request.Schema.parse({
            ...base,
            variant:     'choice',
            title:       'Pick an environment',
            message:     'Where should this run?',
            options:     [{ label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }],
            multiple:    true,
            allowCustom: true,
        })

    return HumanReview.Request.Schema.parse({
        ...base,
        variant: 'form',
        title:   'Refund details',
        message: 'Confirm the refund amount and reason.',
        fields:  [],
    })
}

const pushReview = (variant: HumanReview.Request['variant']) =>
    HumanReviewSDK.actions.addRequest(makeRequest(variant))

// The webhook card brings its own chrome, so Template's card surface is overridden away.
const pushWebhook = () => {
    const id = `debug-webhook-${counter++}`

    InteractionSDK.actions.push(id, props => (
        <InteractionSDK.Template {...props} className='!bg-card/70 !backdrop-blur-md border-border w-[400px] h-[250px] shadow-md shadow-black/10 rounded-2xl'>
            <WebhookRequestCard />
        </InteractionSDK.Template>
    ))
}

// No `timeout` passed — verifies the ring is genuinely opt-in.
const pushPlain = () => {
    const id = `debug-plain-${counter++}`

    InteractionSDK.actions.push(id, props => (
        <InteractionSDK.Template {...props}>
            <div className='p-2.5 flex flex-col gap-2 text-white dark:text-black'>
                <div className='font-semibold'>{id}</div>
                <div className='text-xs opacity-70'>No timeout — this card has no ring.</div>
                <div className='text-xs opacity-70'>index {props.index} / {props.stackSize}</div>
            </div>
        </InteractionSDK.Template>
    ))
}

const InteractionDebugPanel = () => {

    // Object.is so a pure reorder (bringToFront) re-renders the list.
    const interactions = (InteractionSDK.useStore as any)(
        (s: InteractionSDK.State) => s.interactions, Object.is,
    ) as InteractionSDK.State['interactions']

    const ids = Array.from(interactions.keys())

    return (
        <div className='fixed bottom-5 left-5 z-50 flex flex-col gap-2 bg-card/90 backdrop-blur-lg border border-border rounded-xl p-3 shadow-lg min-w-[220px]'>
            <h5 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Interaction Debug</h5>

            <div className='flex flex-row gap-1 flex-wrap'>
                <button className='text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' onClick={() => pushReview('confirm')}>Confirm</button>
                <button className='text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' onClick={() => pushReview('choice')}>Choice</button>
                <button className='text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' onClick={() => pushReview('form')}>Form</button>
            </div>

            <div className='flex flex-row gap-1 flex-wrap'>
                <button className='text-xs px-2 py-1 rounded bg-sky-500/20 text-sky-500 hover:bg-sky-500/30 cursor-pointer' onClick={pushWebhook}>Webhook</button>
                <button className='text-xs px-2 py-1 rounded bg-sky-500/20 text-sky-500 hover:bg-sky-500/30 cursor-pointer' onClick={pushPlain}>Plain</button>
                <button className='text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 cursor-pointer' onClick={() => InteractionSDK.actions.popAll()}>Pop All</button>
            </div>

            {ids.length > 0 && (
                <div className='flex flex-col gap-1 mt-1'>
                    {ids.map((id, i) => (
                        <div key={id} className='flex flex-row items-center gap-2 text-xs'>
                            <span className='text-muted-foreground w-4'>{i}</span>
                            <span className='text-foreground font-mono flex-1 truncate'>{id}</span>
                            <button className='text-primary hover:underline cursor-pointer' onClick={() => InteractionSDK.actions.bringToFront(id)}>↑</button>
                            <button className='text-destructive hover:underline cursor-pointer' onClick={() => InteractionSDK.actions.pop(id)}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default InteractionDebugPanel
