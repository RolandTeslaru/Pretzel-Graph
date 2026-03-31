import { memo } from 'react'
import { ScriptTriggerField } from './ScriptDialog'
import type { RendererProps } from './FieldLabel'

export const ScriptField = memo<RendererProps<'Script'>>((props) => {
    return <ScriptTriggerField {...props} />
})
ScriptField.displayName = "ScriptField"
