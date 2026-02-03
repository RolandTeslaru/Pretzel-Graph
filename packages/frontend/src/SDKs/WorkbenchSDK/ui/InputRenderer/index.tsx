import { memo, useMemo, useEffect } from 'react'
import { Switch } from '@/vx-ui/foundations/switch'
import { Label } from '@/vx-ui/foundations/label'
import { Input } from "@/vx-ui/foundations/input"
import { Select } from "@/vx-ui/foundations/select"
import { Workflow } from '@vx-agent-editor/shared/types';
import { WorkbenchSDK } from '../../sdk'
import { Slider, Tabs, Tooltip, Badge, Button } from '@/vx-ui/foundations'
import { debounce } from 'lodash'
import { VaultSDK } from '../../../VaultSDK/sdk'
import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import VaultPanel from '@/SDKs/VaultSDK/ui/VaultPanel'
import LangchainTypeBadge from '../LangchainTypeBadge'
import { HighlightedTextarea } from './HighlightedTextarea'

export const InputLabel = ({ input, showTypeBadges = true }: { input: Workflow.Node.Input, showTypeBadges?: boolean }) => {
  return (
    <Label className="text-sm font-medium flex items-center">
      {input.uiData.tooltip ?
        <Tooltip.Root>
          <Tooltip.Trigger>
            {input.uiData.displayName}
          </Tooltip.Trigger>
          <Tooltip.Content className='max-w-[300px]'>
            {input.uiData.tooltip}
          </Tooltip.Content>
        </Tooltip.Root>
        : input.uiData.displayName
      }
      {input.required && <span className="text-red-500 ml-1">*</span>}
      {input.isRuntime && <span className="text-neutral-500 ml-auto">runtime</span>}
      {showTypeBadges && (
        <div className='ml-auto flex flex-row gap-1 my-auto'>
          {Array.from(input.langChainDataTypes).map(dataType =>
            <LangchainTypeBadge key={dataType} dataType={dataType} left={true} isInput={true} />
          )}
        </div>
      )}
    </Label>
  )
}




type Input = Workflow.Node.Input

type InputFieldMapRendererType = {
  [K in Input['variant']]?:
  React.ComponentType<{
    input: Extract<Input, { variant: K }>
    nodeId: Workflow.Node.Id
  }>
}

type RendererProps<K extends Input['variant']> = {
  input: Extract<Input, { variant: K }>
  nodeId: Workflow.Node.Id
  className?: string
  showTypeBadges?: boolean
}


const VAR_REGEX = /\$\{([a-zA-Z0-9_]+)\}/g

const handleDynamicInputDetection = debounce((text: string, nodeId: Workflow.Node.Id, inputId: Workflow.Node.Input.Id) => {
  VAR_REGEX.lastIndex = 0; // Safety reset for global regex

  const foundVars = new Set<string>();

  let match;
  while ((match = VAR_REGEX.exec(text)) !== null) {
    foundVars.add(match[1]);
  }

  WorkbenchSDK.actions.runtime.input.set(nodeId, inputId, Array.from(foundVars));

  console.log(foundVars);
}, 500)

const StringInput = memo(({ input, nodeId, className, showTypeBadges }: RendererProps<'string'>) => {
  const data = input.data;
  const value = WorkbenchSDK.useInputValue(nodeId, input)

  return (
    <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
      <InputLabel input={input} showTypeBadges={showTypeBadges} />
      <HighlightedTextarea
        placeholder={input.uiData.placeholder}
        onChange={(e) => {
          const text = e.currentTarget.value;
          handleDynamicInputDetection(text, nodeId, input.id)
          WorkbenchSDK.actions.input.setValue(nodeId, input.id, text)
        }}
        value={value}
        className=""
      />

    </div>
  )
})
StringInput.displayName = "StringInput"





const BooleanInput = memo(({ input, nodeId, className, showTypeBadges }: RendererProps<'boolean'>) => {
  const value = WorkbenchSDK.useInputValue(nodeId, input)

  return (
    <div className={className + " flex items-center justify-between py-2 nodrag cursor-auto"}>
      <InputLabel input={input} showTypeBadges={showTypeBadges} />
      <Switch
        checked={value}
        size={"lg"}
        onCheckedChange={(checked) => {
          WorkbenchSDK.actions.input.setValue(nodeId, input.id, checked)
        }}
      />
    </div>
  )
})
BooleanInput.displayName = "BooleanInput"




const MultiOptionInput = memo(({ input, nodeId, className, showTypeBadges }: RendererProps<'multiOption'>) => {
  const data = input.data
  const value = WorkbenchSDK.useInputValue(nodeId, input)

  return (
    <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
      {data.variant === "tab" ?
        <div className=' flex flex-row'>
          <InputLabel input={input} showTypeBadges={showTypeBadges} />
          <Tabs.Root
            value={value}
            onValueChange={val => { WorkbenchSDK.actions.input.setValue(nodeId, input.id, val); }}
            className='ml-auto'

          >
            <Tabs.List
              indicatorVariant="accent"
            >
              {data.options.map((opt) => (
                <Tabs.Trigger key={opt} value={opt}>{opt}</Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        </div>
        :
        <>
          <InputLabel input={input} showTypeBadges={showTypeBadges} />
          <Select.Root
            value={value}
            onValueChange={(value) => { WorkbenchSDK.actions.input.setValue(nodeId, input.id, value) }}
          >
            <Select.Trigger className="w-full">
              <Select.Value placeholder={input.uiData.placeholder} />
            </Select.Trigger>
            <Select.Content>
              {data.options.map((opt) => (
                <Select.Item key={opt} value={opt}>{opt}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </>
      }
    </div>
  )
})
MultiOptionInput.displayName = "MultiOptionInput"




const IntegerInput = memo(({ input, nodeId, className, showTypeBadges }: RendererProps<'integer'>) => {
  const data = input.data
  const value = WorkbenchSDK.useInputValue(nodeId, input)

  return (
    <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
      <InputLabel input={input} showTypeBadges={showTypeBadges} />
      <Input
        type="number"
        step="1"
        min={data.min}
        max={data.max}
        value={value}
        onChange={(e) => {
          const val = e.currentTarget.value;
          WorkbenchSDK.actions.input.setValue(nodeId, input.id, val)
        }} />
      {data.slider &&
        <Slider
          min={data.min}
          max={data.max}
          step={data.step && data.step}
          value={value}
          onValueChange={val => {
            WorkbenchSDK.actions.input.setValue(nodeId, input.id, val)
          }}
        />
      }
    </div>
  )
})
IntegerInput.displayName = "IntegerInput"




const FloatInput = memo(({ input, nodeId, className, showTypeBadges }: RendererProps<'float'>) => {
  const data = input.data
  const value = WorkbenchSDK.useInputValue(nodeId, input)

  const hasSlider = data.slider;

  return (
    <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
      {hasSlider ?
        <>
          <div className='flex flex-row'>
            <InputLabel input={input} showTypeBadges={showTypeBadges} />
            <Input
              type="number"
              className='ml-auto w-fit! h-6'
              value={value}
              step={data.step && data.step}
              min={data.min}
              max={data.max}
              onChange={(e) => {
                const val = e.currentTarget.value;
                WorkbenchSDK.actions.input.setValue(nodeId, input.id, val)
              }}
            />

          </div>
          <Slider
            min={data.min}
            max={data.max}
            step={data.step && data.step}
            value={[value]}
            onValueChange={values => {
              WorkbenchSDK.actions.input.setValue(nodeId, input.id, values[0])
            }}
          />
        </>
        :
        <>
          <InputLabel input={input} showTypeBadges={showTypeBadges} />
          <Input
            type="number"
            value={value}
            step={data.step && data.step}
            min={data.min}
            max={data.max}
            onChange={(e) => {
              const val = e.currentTarget.value;
              WorkbenchSDK.actions.input.setValue(nodeId, input.id, val)
            }}
          />
        </>

      }

    </div>
  )
})
FloatInput.displayName = "FloatInput"




const FileInput = memo(({ input, nodeId, className, showTypeBadges }: RendererProps<'file'>) => {
  const value = WorkbenchSDK.useInputValue(nodeId, input)

  return (
    <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
      <InputLabel input={input} showTypeBadges={showTypeBadges} />
      <div className="flex items-center gap-2">
        <Input
          value={value}
          readOnly
          className="opacity-50"
          onChange={(e) => {
            const val = e.currentTarget.value;
            WorkbenchSDK.actions.input.setValue(nodeId, input.id, val)
          }}
        />
      </div>
    </div>
  )
})
FileInput.displayName = "FileInput"




const OtherInput = memo(({ input, nodeId, showTypeBadges }: { input: Workflow.Node.Input, nodeId: Workflow.Node.Id, showTypeBadges: boolean }) => {
  const value = WorkbenchSDK.useInputValue(nodeId, input)

  return (
    <>
      <InputLabel input={input} showTypeBadges={showTypeBadges} />
      <Input
        value={String(value)}
        disabled
      />
      <div className="text-[10px] text-muted-foreground mt-1">Unknown variant: {input.variant}</div>
    </>
  )
})
OtherInput.displayName = "OtherInput"




const SecretInput = memo(({ input, nodeId, className, showTypeBadges }: RendererProps<'secret'>) => {
  const value = WorkbenchSDK.useInputValue(nodeId, input)
  const credentials = VaultSDK.useStore(s => s.credentials)

  // ensure credentials are loaded
  useEffect(() => {
    if (credentials.length === 0) {
      VaultSDK.actions.refreshAll().catch(() => { })
    }
  }, [])

  return (
    <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
      <InputLabel input={input} showTypeBadges={showTypeBadges} />

      <Select.Root
        value={value}
        onValueChange={(val) => {
          WorkbenchSDK.actions.input.setValue(nodeId, input.id, val)
        }}
      >
        <Select.Trigger className="w-full">
          <Select.Value placeholder="Select a credential..." />
        </Select.Trigger>
        <Select.Content>
          {credentials.map(c => (
            <Select.Item key={c.id} value={`credential:${c.id}`}>
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
SecretInput.displayName = "SecretInput"




export const INPUT_FIELD_RENDERER_MAP: InputFieldMapRendererType = {
  "string": StringInput,
  "boolean": BooleanInput,
  "multiOption": MultiOptionInput,
  "integer": IntegerInput,
  "float": FloatInput,
  "file": FileInput,
  "secret": SecretInput,
  // @ts-expect-error
  "other": OtherInput,
  // Add other variants as needed or let them fall back
};

