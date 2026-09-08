import { memo } from 'react'
import { FieldLabel, type RendererProps } from './FieldLabel';
import { Button } from '@pretzel-graph/standard-ui/foundations';
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk';
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK';
import { CodeEditorContent } from '../CodeEditor';

export const ScriptField = memo(({ field, nodeId, className }: RendererProps<'Script'>) => {
    const [localValue, onChange, flush] = WorkbenchSDK.useField<string>(nodeId, field);

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1 relative"}>
            <FieldLabel field={field} />
            <Button variant="input" className="justify-start overflow-hidden"
                onClick={() => {
                    const snapshot = localValue;
                    const node = WorkbenchSDK.document.selectors.node.get(WorkbenchSDK.document, nodeId);
                    if (!node) return;

                    DialogSDK.actions
                             .push("ScriptDialog", (dialogProps) => (
                                <DialogSDK.UnstyledTemplate {...dialogProps}>
                                    <CodeEditorContent node={node} displayName={field.displayName} onChange={onChange} onClose={flush} initialValue={snapshot} blockTransparency={dialogProps.blockTransparency} surfaceStyle={dialogProps.surfaceStyle} />
                                </DialogSDK.UnstyledTemplate>
                            ))
                }}
            >
                <p className="font-mono text-xs truncate w-full min-w-0">{localValue}</p>
            </Button>
        </div>
    )
})
ScriptField.displayName = "ScriptField"
