import { memo, Suspense, lazy, useEffect, useState } from 'react'
import { FieldLabel, type RendererProps } from './FieldLabel';
import { Button, Dialog, Spinner } from '@pretzel-graph/standard-ui/foundations';
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk';
import { DialogSDK } from '@/SDKs/DialogSDK';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import FloatContainer from '@/components/FloatContainer';
import { SystemSDK } from '@/SDKs/SystemSDK';
import IncomingPanel from '../NodePanel/IncomingPanel';
import OutgoingPanel from '../NodePanel/OutgoingPanel';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export const ScriptField = memo(({ field, nodeId, className }: RendererProps<'Script'>) => {
    const [localValue, onChange, , , isReconciling] = WorkbenchSDK.useDebouncedField<string>(nodeId, field);

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1 relative"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Button variant="input" className="overflow-hidden text-left text-ellipsis whitespace-nowrap relative"
                onClick={() => {
                    const snapshot = localValue;
                    DialogSDK.actions.push("ScriptDialog", (dialogProps) => (
                        <DialogSDK.Template {...dialogProps} className='overflow-hidden! border-none! bg-white/0! shadow-none! flex flex-row gap-4'>
                            <ScriptDialogContent displayName={field.displayName} onChange={onChange} initialValue={snapshot} />
                        </DialogSDK.Template>
                    ))
                }}
            >
                <p className="font-mono text-xs">{localValue}</p>
            </Button>
        </div>
    )
})
ScriptField.displayName = "ScriptField"

interface Props {
    displayName: string, 
    onChange: (val: string) => void, 
    initialValue: string 
}

const ScriptDialogContent = ({ displayName, onChange, initialValue }: Props) => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 300)
        return () => clearTimeout(timer)
    }, [])

    const theme = SystemSDK.useStore(s => s.theme)

    return (
        <div className="flex flex-row gap-5 h-[85vh] w-[90vw]">

            <div className='bg-card/80 overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg'>
                <IncomingPanel />
            </div>


            <div className='flex  min-w-[50vw] flex-col relative gap-2 h-full flex-1 overflow-hidden bg-card/80  border-border border rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg'>
                <FloatContainer className="absolute top-2 left-2 w-fit h-12 px-3 backdrop-blur-md z-10">
                    <SystemIcons.FileCode className=" size-4 my-auto" />
                    <Dialog.Title>{displayName}</Dialog.Title>
                </FloatContainer>
                <div className="flex-1 h-full min-h-0 overflow-hidden relative [&_.monaco-editor]:!bg-transparent [&_.monaco-editor-background]:!bg-transparent [&_.monaco-editor_.margin]:!bg-transparent">
                    {mounted ? (
                        <Suspense
                            fallback={
                                <div className="absolute inset-0 flex gap-4 items-center justify-center">
                                    <p className="text-sm font-medium text-primary-foreground animate-pulse">
                                        Loading Editor
                                    </p>
                                    <Spinner />
                                </div>
                            }>
                            <MonacoEditor
                                height="85vh"
                                defaultLanguage="typescript"
                                theme={theme === "dark" ? "vs-dark" : "light"}
                                defaultValue={initialValue}
                                beforeMount={(monaco) => {
                                    const ts = monaco.languages.typescript.typescriptDefaults;
                                    ts.setDiagnosticsOptions({ ...ts.getDiagnosticsOptions(), diagnosticCodesToIgnore: [1108] });
                                }}
                                onChange={(val) => onChange(val || "")}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    padding: { top: 50 },
                                    scrollBeyondLastLine: false,
                                }}
                            />
                        </Suspense>
                    ) : (
                        <div className="absolute inset-0 flex gap-4 items-center justify-center">
                            <p className="text-sm font-medium text-primary-foreground animate-pulse">
                                Loading Editor
                            </p>
                            <Spinner />
                        </div>
                    )}
                </div>
            </div>

            <div className='bg-card/80 overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg'>
                <OutgoingPanel />
            </div>
        </div>
    )
}
