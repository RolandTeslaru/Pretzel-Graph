import { Consultation, HumanReview } from '@pretzel-graph/shared/domain'
import { Webhook } from '@pretzel-graph/shared/domain/Webhook'
import { ExecutionSDK } from '../../ExecutionSDK/sdk'
import { ConsultationSDK } from '../sdk'

let counter = 0

// Fixtures go in through ExecutionSDK, i.e. onto the session, so the real sync path runs
// (session → reconcile → stack → renderer lookup by variant). Answering hits the API with a
// fake consultation id and will fail — dismiss with ✕.
const base = () => ({
    id:        crypto.randomUUID(),
    nodeId:    `debug-node-${counter++}`,
    startedAt: Date.now(),
    timeoutMs: 60_000,
})

const push = (request: Consultation.Request) =>
    ExecutionSDK.actions.pendingConsultations.add(request)

const pushConfirm = () => push(HumanReview.Request.Confirm.parse({
    ...base(),
    variant: HumanReview.Variant.Confirm,
    title:   'Deploy to production?',
    message: 'The agent wants to deploy build #4821.',
}))

const pushChoice = () => push(HumanReview.Request.Choice.parse({
    ...base(),
    variant:     HumanReview.Variant.Choice,
    title:       'Pick an environment',
    message:     'Where should this run?',
    options:     [{ label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }],
    multiple:    true,
    allowCustom: true,
}))

const pushForm = () => push(HumanReview.Request.Form.parse({
    ...base(),
    variant: HumanReview.Variant.Form,
    title:   'Refund details',
    message: 'Confirm the refund amount and reason.',
    fields:  [],
}))

const pushWebhook = () => push(Webhook.Test.Consultation.Request.parse({
    ...base(),
    variant: Webhook.Test.Consultation.Variant,
    path:    'incoming',
    method:  'POST',
}))

// An unregistered variant — exercises the fallback card rather than crashing the stack.
const pushUnknown = () => push(Consultation.Request.parse({
    ...base(),
    variant: 'debug:unregistered',
}))

const ConsultationDebugPanel = () => {

    // Object.is so a pure reorder (bringToFront) re-renders the list.
    const consultations = (ConsultationSDK.useStore as any)(
        (s: ConsultationSDK.State) => s.consultations, Object.is,
    ) as ConsultationSDK.State['consultations']

    const ids = Array.from(consultations.keys())

    return (
        <div className='fixed bottom-5 left-5 z-50 flex flex-col gap-2 bg-card/90 backdrop-blur-lg border border-border rounded-xl p-3 shadow-lg min-w-[220px]'>
            <h5 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Consultation Debug</h5>

            <div className='flex flex-row gap-1 flex-wrap'>
                <button className='text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' onClick={pushConfirm}>Confirm</button>
                <button className='text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' onClick={pushChoice}>Choice</button>
                <button className='text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' onClick={pushForm}>Form</button>
            </div>

            <div className='flex flex-row gap-1 flex-wrap'>
                <button className='text-xs px-2 py-1 rounded bg-sky-500/20 text-sky-500 hover:bg-sky-500/30 cursor-pointer' onClick={pushWebhook}>Webhook</button>
                <button className='text-xs px-2 py-1 rounded bg-sky-500/20 text-sky-500 hover:bg-sky-500/30 cursor-pointer' onClick={pushUnknown}>Unknown</button>
                <button className='text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 cursor-pointer' onClick={() => ExecutionSDK.actions.pendingConsultations.clear()}>Clear</button>
            </div>

            {ids.length > 0 && (
                <div className='flex flex-col gap-1 mt-1'>
                    {ids.map((id, i) => (
                        <div key={id} className='flex flex-row items-center gap-2 text-xs'>
                            <span className='text-muted-foreground w-4'>{i}</span>
                            <span className='text-foreground font-mono flex-1 truncate'>{id}</span>
                            <button className='text-primary hover:underline cursor-pointer' onClick={() => ConsultationSDK.actions.bringToFront(id)}>↑</button>
                            <button className='text-destructive hover:underline cursor-pointer' onClick={() => ExecutionSDK.actions.pendingConsultations.remove(id)}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ConsultationDebugPanel
