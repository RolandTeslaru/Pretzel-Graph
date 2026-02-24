import { memo, useEffect } from 'react'
import { Switch } from '@/vx-ui/foundations/switch'
import { Label } from '@/vx-ui/foundations/label'
import { Input } from "@/vx-ui/foundations/input"
import { Select } from "@/vx-ui/foundations/select"
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { WorkbenchSDK } from '../../sdk'
import { Slider, Tabs, Badge, Textarea } from '@/vx-ui/foundations'
import { VaultSDK } from '../../../VaultSDK/sdk'
import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import VaultPanel from '@/SDKs/VaultSDK/ui/VaultPanel'
import { ScriptTriggerField } from './ScriptDialog'

interface LabelProps {
    field: Foundations.Field
}

export const FieldLabel = ({ field }: LabelProps) => {
    return (
        <Label className="text-sm font-medium flex items-center">
            {field.displayName}
            {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
    )
}

export type RendererProps<K extends Foundations.Field['variant']> = {
    field: Extract<Foundations.Field, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
}


const StringField = memo(({ field, nodeId, className }: RendererProps<'String'>) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id)

    let innerClassName = ""
    if (issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} />
            <Textarea
                placeholder={field.placeholder}
                value={value as string}
                onChange={(e) => WorkbenchSDK.actions.field.setValue(nodeId, field, e.target.value)}
                className={innerClassName}
            />
        </div>
    )
})
StringField.displayName = "StringField"





const BooleanField = memo(({ field, nodeId, className }: RendererProps<'Boolean'>) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id)


    return (
        <div className={className + " flex items-center justify-between py-2 nodrag cursor-auto"}>
            <FieldLabel field={field} />
            <Switch
                checked={!!value}
                size={"lg"}
                onCheckedChange={(checked) => {
                    WorkbenchSDK.actions.field.setValue(nodeId, field, checked)
                }}
            />
        </div>
    )
})
BooleanField.displayName = "BooleanField"




const MultiOptionField = memo(({ field, nodeId, className }: RendererProps<'MultiOption'>) => {
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




const IntegerField = memo(({ field, nodeId, className }: RendererProps<'Integer'>) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id);
    const hasSlider = field.slider;

    let errorClass = ""
    if (issue)
        errorClass = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            {hasSlider ?
                <>
                    <div className='flex flex-row'>
                        <FieldLabel field={field} />
                        <Input
                            type="number"
                            className={`ml-auto w-20 h-6 ${errorClass}`}
                            value={value as string}
                            step={field.step ?? 1}
                            min={field.min}
                            max={field.max}
                            onChange={(e) => {
                                const val = e.currentTarget.value;
                                WorkbenchSDK.actions.field.setValue(nodeId, field, Number(val))
                            }}
                        />

                    </div>
                    <Slider
                        className={`pt-1 ${issue ? "opacity-50" : ""}`}
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        value={[Number(value) || 0]}
                        onValueChange={val => {
                            WorkbenchSDK.actions.field.setValue(nodeId, field, val[0])
                        }}
                    />
                </>
                :
                <>
                    <FieldLabel field={field} />
                    <Input
                        type="number"
                        className={errorClass}
                        step={field.step ?? 1}
                        min={field.min}
                        max={field.max}
                        value={value as string}
                        onChange={(e) => {
                            const val = e.currentTarget.value;
                            WorkbenchSDK.actions.field.setValue(nodeId, field, Number(val))
                        }} />
                </>
            }
        </div>
    )
})
IntegerField.displayName = "IntegerField"




const FloatField = memo(({ field, nodeId, className }: RendererProps<'Float'>) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id);

    const hasSlider = field.slider;

    let errorClass = ""
    if (issue)
        errorClass = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            {hasSlider ?
                <>
                    <div className='flex flex-row'>
                        <FieldLabel field={field} />
                        <Input
                            type="number"
                            className={`ml-auto w-20 h-6 ${errorClass}`}
                            value={value as string}
                            step={field.step && field.step}
                            min={field.min}
                            max={field.max}
                            onChange={(e) => {
                                const val = e.currentTarget.value;
                                WorkbenchSDK.actions.field.setValue(nodeId, field, Number(val))
                            }}
                        />

                    </div>
                    <Slider
                        className={`pt-1 ${issue ? "opacity-50" : ""}`}
                        min={field.min}
                        max={field.max}
                        step={field.step && field.step}
                        value={[Number(value) || 0]}
                        onValueChange={values => {
                            WorkbenchSDK.actions.field.setValue(nodeId, field, values[0])
                        }}
                    />
                </>
                :
                <>
                    <FieldLabel field={field} />
                    <Input
                        type="number"
                        className={errorClass}
                        value={value as string}
                        step={field.step && field.step}
                        min={field.min}
                        max={field.max}
                        onChange={(e) => {
                            const val = e.currentTarget.value;
                            WorkbenchSDK.actions.field.setValue(nodeId, field, Number(val))
                        }}
                    />
                </>

            }

        </div>
    )
})
FloatField.displayName = "FloatField"




const FileField = memo(({ field, nodeId, className }: RendererProps<'File'>) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id);

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} />
            <div className="flex items-center gap-2">
                <Input
                    value={value as string}
                    readOnly
                    className={`opacity-50 ${issue ? "border-2 border-destructive animate-border-ping" : ""}`}
                    onChange={(e) => {
                        const val = e.currentTarget.value;
                        WorkbenchSDK.actions.field.setValue(nodeId, field, val)
                    }}
                />
            </div>
        </div>
    )
})
FileField.displayName = "FileField"




const OtherField = memo(({ field, nodeId }: { field: Foundations.Field, nodeId: Workflow.Node.Id }) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id);

    return (
        <>
            <FieldLabel field={field} />
            <Input
                value={String(value)}
                disabled
                className={issue ? "border-2 border-destructive animate-border-ping" : ""}
            />
            <div className="text-[10px] text-muted-foreground mt-1">Unknown variant: {field.variant}</div>
        </>
    )
})
OtherField.displayName = "OtherField"




const SecretField = memo(({ field, nodeId, className }: RendererProps<'Secret'>) => {
    const [value, issue] = WorkbenchSDK.useField(nodeId, field.id);
    const credentials = VaultSDK.useStore(s => s.credentials)

    // ensure credentials are loaded
    useEffect(() => {
        if (credentials.length === 0) {
            VaultSDK.actions.refreshAll().catch(() => { })
        }
    }, [])

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} />

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



const ScriptField = memo((props: RendererProps<'Script'>) => {

    return <ScriptTriggerField {...props} />
})
ScriptField.displayName = "ScriptField"


// ── Dispatcher ──────────────────────────────────────────────

type FieldRendererMapType = {
    [K in Foundations.Field['variant']]?:
    React.ComponentType<{
        field: Extract<Foundations.Field, { variant: K }>
        nodeId: Workflow.Node.Id
        className?: string
    }>
}

export const FIELD_RENDERER_MAP: FieldRendererMapType = {
    String: StringField,
    Boolean: BooleanField,
    Integer: IntegerField,
    Float: FloatField,
    MultiOption: MultiOptionField,
    Secret: SecretField,
    File: FileField,
    Script: ScriptField,
}

/** Renders the appropriate field component based on variant */
export const FieldRenderer = memo(({ field, nodeId, className }: {
    field: Foundations.Field
    nodeId: Workflow.Node.Id
    className?: string
}) => {
    const Component = FIELD_RENDERER_MAP[field.variant] as React.ComponentType<{
        field: Foundations.Field
        nodeId: Workflow.Node.Id
        className?: string
    }> | undefined

    if (Component)
        return <Component field={field} nodeId={nodeId} className={className} />

    return <OtherField field={field} nodeId={nodeId} />
})