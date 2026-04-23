import { memo, useEffect } from 'react'
import { Select } from "@pretzel-graph/standard-ui/foundations/select"
import { Badge } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { VaultSDK } from '@/SDKs/VaultSDK/sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import VaultPanel from '@/SDKs/VaultSDK/ui/VaultPanel'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

export const SecretField = memo<RendererProps<'Secret'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id);
    const credentials = VaultSDK.useStore(s => s.credentials)

    useEffect(() => {
        if (credentials.length === 0) {
            VaultSDK.actions.refreshAll().catch(() => { })
        }
    }, [])

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} isReconciling={isReconciling} />

            <Select.Root
                value={value as string}
                onValueChange={(val) => {
                    console.log("Setting secret field value to", val)
                    WorkbenchSDK.actions.field.setValue(nodeId, field, val)
                }}
            >
                <Select.Trigger className={`w-full ${issue ? "border-2 border-destructive animate-border-ping ring-1 ring-destructive/50" : ""}`}>
                    <Select.Value placeholder={"Select a credential..."} />
                </Select.Trigger>
                <Select.Content>
                    {credentials.map(c => (
                        <Select.Item key={c.id} value={c.id}>
                            <div className="flex items-center justify-between w-full gap-2 min-w-[200px]">
                                <span>{c.name}</span>
                                <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1">{c.provider}</Badge>
                            </div>
                        </Select.Item>
                    ))}
                    <button className='text-center w-full p-1 cursor-pointer text-sm'
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            DialogSDK.actions.push("vault", (props) =>
                                <DialogSDK.Template {...props}>
                                    <VaultPanel />
                                </DialogSDK.Template>
                            )
                            e.stopPropagation()
                        }}
                    >
                        + Add Credential
                    </button>
                </Select.Content>
            </Select.Root>
        </div>
    )
})
SecretField.displayName = "SecretField"
