import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { buildAirlockDts } from './airlockTypes';
import type { Workflow } from '@pretzel-graph/shared/domain';
import { Dialog, Spinner } from '@pretzel-graph/standard-ui/foundations';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import FloatContainer from '@/components/FloatContainer';
import { SystemSDK } from '@/SDKs/SystemSDK';
import IncomingPanel from '../NodePanel/IncomingPanel';
import OutgoingPanel from '../NodePanel/OutgoingPanel';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface Props {
    nodeId: Workflow.Node.Id,
    displayName: string,
    onChange: (val: string) => void,
    onClose: () => void,
    initialValue: string
}

export const CodeEditorContent = ({ nodeId, displayName, onChange, onClose, initialValue }: Props) => {
    const [mounted, setMounted] = useState(false)
    const extraLibRef = useRef<{ dispose(): void } | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 300)
        return () => clearTimeout(timer)
    }, [])

    // commit the buffered script to the store when the editor closes
    useEffect(() => () => onClose(), [onClose])

    useEffect(() => () => extraLibRef.current?.dispose(), [])

    const theme = SystemSDK.useStore(s => s.theme)

    return (
        <div className="flex flex-row gap-5 h-[85vh] w-[90vw]">

            <div className='bg-card/80 overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg'>
                <IncomingPanel />
            </div>


            <div className='flex  min-w-[50vw] flex-col relative gap-2 h-full flex-1 overflow-hidden bg-card/80  border-border border rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg'>
                <FloatContainer className="absolute top-2 left-2 w-fit h-12 px-3 backdrop-blur-md z-10">
                    <SystemIcons.FileCode className=" size-4 my-auto" />
                    <Dialog.Title className="font-mono">{displayName}</Dialog.Title>
                </FloatContainer>
                <div className="flex-1 h-full min-h-0 overflow-hidden relative [&_.monaco-editor]:bg-transparent! [&_.monaco-editor-background]:bg-transparent! [&_.monaco-editor_.margin]:bg-transparent!">
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
                                    extraLibRef.current?.dispose();
                                    extraLibRef.current = ts.addExtraLib(buildAirlockDts(nodeId), 'ts:airlock-globals.d.ts');
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
