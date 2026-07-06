import { WorkbenchSDK } from '../../sdk'
import { CredentialPicker } from '../NodePanel/CredentialPicker'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'

export const CredentialsSettings = () => {
    const nodes = WorkbenchSDK.useStore(s =>
        Object.values(s.data.nodes).filter(n => (s.selectors.node.getBlueprint(s, n.id)?.credentials?.length ?? 0) > 0)
    )

    if (nodes.length === 0) {
        return (
            <div className='absolute top-1/2 -translate-y-1/2 w-full text-center text-sm text-muted-foreground'>
                No credentials required
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-3'>
            {nodes.map(node => {
                const ui = WorkbenchSDK.state.selectors.node.getUI(WorkbenchSDK.state, node.id)
                const credentials = WorkbenchSDK.state.selectors.node.getBlueprint(WorkbenchSDK.state, node.id).credentials ?? []
                return (
                    <div key={node.id} className='rounded-md border border-border/50 bg-card/50 p-2.5 flex flex-col gap-2'>
                        <div className='flex items-center gap-2'>
                            <LazyIcon name={ui.icon} className='size-3.5 text-muted-foreground' />
                            <span className='text-xs font-medium'>{ui.displayName}</span>
                        </div>
                        {credentials.map(cred => (
                            <CredentialPicker key={cred.id} credentialTemplate={cred} nodeId={node.id} />
                        ))}
                    </div>
                )
            })}
        </div>
    )
}
