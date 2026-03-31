import { memo } from 'react'
import { Select } from "@vx-agent-editor/vx-ui/foundations/select"
import { Tabs } from '@vx-agent-editor/vx-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

export const MultiOptionField = memo<RendererProps<'MultiOption'>>(({ field, nodeId, className }) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id);

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            {field.kind === "tab" ?
                <div className=' flex flex-row'>
                    <FieldLabel field={field} />
                    <Tabs.Root
                        value={value as string}
                        onValueChange={val => { WorkbenchSDK.actions.field.setValue(nodeId, field, val); }}
                        className={`ml-auto ${issue ? "border-2 border-destructive rounded-md animate-border-ping ring-1 ring-destructive/50" : ""}`}
                    >
                        <Tabs.List size="sm">
                            {field.options.map((opt) => (
                                <Tabs.Trigger key={opt} value={opt}>{opt}</Tabs.Trigger>
                            ))}
                        </Tabs.List>
                    </Tabs.Root>
                </div>
                :
                <>
                    <FieldLabel field={field} />
                    <Select.Root
                        value={value as string}
                        onValueChange={(value) => { WorkbenchSDK.actions.field.setValue(nodeId, field, value) }}
                    >
                        <Select.Trigger className={`w-full ${issue ? "border-2 border-destructive animate-border-ping ring-1 ring-destructive/50" : ""}`}>
                            <Select.Value placeholder={field.placeholder} />
                        </Select.Trigger>
                        <Select.Content>
                            {field.options.map((opt) => (
                                <Select.Item key={opt} value={opt}>{opt}</Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                </>
            }
        </div>
    )
})
MultiOptionField.displayName = "MultiOptionField"
