import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Workflow } from '@pretzel-graph/shared/domain'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { WorkbenchSDK } from '../../../sdk'
import { CredentialForm } from '@/SDKs/VaultSDK/ui/CredentialForm'
import { PROXY_TEMPLATE_ID } from '../proxy'

interface Props {
    hyNode: Workflow.Node.Hydrated
    onEdit: () => void
}

export const OptionsDropdown = ({ hyNode, onEdit }: Props) => {
    const isTool = WorkbenchSDK.useStore(s => s.selectors.node.isTool(s, hyNode.id))

    // Auto-appended to every proxyCompatible blueprint by defineBlueprint.
    const proxyTemplate = WorkbenchSDK.useStore(s =>
        s.selectors.credential.getTemplate(s, hyNode.id, PROXY_TEMPLATE_ID)
    )

    const [proxyInstanceId, setProxyInstance] = WorkbenchSDK.useCredential(hyNode.id, PROXY_TEMPLATE_ID)

    const openProxyDialog = () => {
        if (!proxyTemplate)
            return

        const dialogId = `add-credentialTemplate-${proxyTemplate.id}`

        DialogSDK.actions.push(dialogId, props => (
            <DialogSDK.Template {...props}>
                <CredentialForm
                    credentialTemplate={proxyTemplate}
                    onCreated={instanceId => setProxyInstance(instanceId)}
                />
            </DialogSDK.Template>
        ))
    }

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button size="icon-xs" variant="ghost">
                    <SystemIcons.Ellipsis className='text-secondary-foreground' />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" sideOffset={6}>
                <DropdownMenu.Item onClick={onEdit}>
                    <SystemIcons.SquarePen />
                    Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => { WorkbenchSDK.actions.node.recreate(hyNode.id) }}>
                    <SystemIcons.Undo />
                    Recreate
                </DropdownMenu.Item>
                {hyNode.dependencyRef && (
                    <DropdownMenu.Item onClick={() => WorkbenchSDK.openWorkflowWindow(hyNode.dependencyRef!.workflowId)}>
                        <SystemIcons.Graph />
                        Open workflow
                    </DropdownMenu.Item>
                )}
                {hyNode.blueprint.toolCompatible && (
                    <DropdownMenu.Item onClick={() => isTool ? WorkbenchSDK.actions.tool.revert(hyNode.id) : WorkbenchSDK.actions.tool.convert(hyNode.id)}>
                        <SystemIcons.Hammer />
                        {isTool ? "Revert to node" : "Convert to tool"}
                    </DropdownMenu.Item>
                )}
                {hyNode.blueprint.proxyCompatible && (
                    <DropdownMenu.Item onClick={() => proxyInstanceId ? setProxyInstance(null) : openProxyDialog()}>
                        <SystemIcons.Globe />
                        {proxyInstanceId ? "Remove Proxy" : "Attach Proxy"}
                    </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator />
                <DropdownMenu.Item onClick={() => navigator.clipboard.writeText(hyNode.id)}>
                    <SystemIcons.Copy />
                    Copy Node ID
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => navigator.clipboard.writeText(hyNode.blueprintId)}>
                    <SystemIcons.Copy />
                    Copy Blueprint ID
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item variant="destructive" onClick={() => WorkbenchSDK.actions.node.remove(hyNode.id)}>
                    <SystemIcons.Trash2 />
                    Delete
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
