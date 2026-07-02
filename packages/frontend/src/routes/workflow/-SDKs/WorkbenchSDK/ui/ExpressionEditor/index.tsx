import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { debounce } from 'lodash'
import type { BeforeMount } from '@monaco-editor/react'
import type { Airlock, Workflow } from '@pretzel-graph/shared/domain';
import { Dialog, ScrollArea } from '@pretzel-graph/standard-ui/foundations';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import FloatContainer from '@/components/FloatContainer';
import { MonacoEditor } from '@/components/MonacoEditor';
import { AirlockSDK } from '@/routes/workflow/-SDKs/AirlockSDK';
import { buildAirlockDts } from '../CodeEditor/airlockTypes';
import IncomingPanel from '../NodePanel/IncomingPanel';
import OutgoingPanel from '../NodePanel/OutgoingPanel';
import JsonView from 'react18-json-view';

function formatResult(value: unknown) {
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    return value
}

interface Props {
    node: Workflow.Node,
    displayName: string,
    onChange: (val: string) => void,
    onClose: () => void,
    initialValue: string,
    // editing an item-scoped field → expose $item / $itemIndex in autocomplete
    itemScoped?: boolean,
    blockTransparency: boolean,
    surfaceStyle: CSSProperties,
}

export const ExpressionEditor = ({ node, displayName, onChange, onClose, initialValue, itemScoped, blockTransparency, surfaceStyle }: Props) => {
    const [result, setResult] = useState<AirlockSDK.Result>({ ok: true, value: undefined })
    const extraLibRef = useRef<{ dispose(): void } | null>(null)

    // onClose is a fresh closure every render (it closes over the latest draft) — keep
    // it in a ref so the unmount cleanup below always commits the most recent value,
    // instead of re-running on every keystroke and firing a stale, one-behind closure.
    const onCloseRef = useRef(onClose)
    useEffect(() => { onCloseRef.current = onClose }, [onClose])

    // commit the buffered expression to the store when the editor closes
    useEffect(() => () => onCloseRef.current(), [])

    useEffect(() => () => extraLibRef.current?.dispose(), [])

    const beforeMount = useCallback<BeforeMount>((monaco) => {
        const ts = monaco.languages.typescript.typescriptDefaults;
        ts.setDiagnosticsOptions({ ...ts.getDiagnosticsOptions(), diagnosticCodesToIgnore: [1108] });
        extraLibRef.current?.dispose();
        extraLibRef.current = ts.addExtraLib(buildAirlockDts(node.id, { itemScoped }), 'ts:airlock-globals.d.ts');
    }, [node.id, itemScoped])

    // live preview — same rewrite + WorkflowView the worker runs at runtime
    const preview = useMemo(
        () => debounce((val: string) => { AirlockSDK.previewExpression(val as Airlock.Source.Expression, node.id).then(setResult) }, 500),
        [node.id]
    )
    useEffect(() => {
        AirlockSDK.previewExpression(initialValue as Airlock.Source.Expression, node.id)?.then(setResult)
        return () => preview.cancel()
    }, [preview, initialValue, node.id])

    const handleChange = useCallback((val: string) => {
        onChange(val)
        preview(val)
    }, [onChange, preview])

    // In the background render solid; on top, frosted glass. `surfaceStyle` carries the stack
    // brightness — applied per card so each card's backdrop-blur isn't trapped by a filtered ancestor.
    const surface = blockTransparency ? 'bg-card' : 'bg-card/80 backdrop-blur-lg'

    return (
        <div className="flex flex-row gap-5 h-[85vh] w-[90vw]">

            <div style={surfaceStyle} className={`${surface} w-[30%] overflow-hidden min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10`}>
                <IncomingPanel />
            </div>

            <div style={surfaceStyle} className={`${surface} flex flex-col w-[70%] border-border border rounded-2xl shadow-xl shadow-black/10`}>
                <div className={`
                    flex-col relative gap-2 h-full flex-1 overflow-hidden
                    
                `}>
                    <FloatContainer className="absolute top-2 left-2 w-fit h-12 py-1! px-3 backdrop-blur-md z-10">
                        <SystemIcons.MathFunction className=" size-4 my-auto" />
                        <Dialog.Title className="font-mono text-sm">Expression Editor</Dialog.Title>
                    </FloatContainer>
                    
                    <div className="absolute flex gap-1 flex-row top-2.5 right-1/2 translate-x-1/2 p-1 px-2 text-sm font-medium">
                        <p>
                            {node.displayName}
                        </p>
                        <SystemIcons.ChevronRight className="size-5 mx-auto" />
                        <p>
                            {displayName}
                        </p>
                    </div>

                    <MonacoEditor
                        defaultLanguage="typescript"
                        height="100%"
                        defaultValue={initialValue}
                        onChange={handleChange}
                        beforeMount={beforeMount}
                    />
                </div>

                <div className='relative border-t border-border w-full h-[30%] text-[11px]  overflow-hidden'>
                    <ScrollArea.Root className='h-full'>    
                        <JsonView
                            src={result.ok ? formatResult(result.value) : result.error}
                            collapsed={3}
                            theme="default"
                            className={"px-4 py-2 " + (result.ok ? "text-foreground" : "text-destructive")}
                        />
                        {/* <pre className={"pt-2 px-4  inset-0 overflow-auto font-mono text-xs whitespace-pre-wrap break-words " + (result.ok ? "text-foreground" : "text-destructive")}>
                            {result.ok ? formatResult(result.value) : result.error}
                        </pre> */}
                    </ScrollArea.Root>
                </div>
            </div>

        </div>
    )
}
