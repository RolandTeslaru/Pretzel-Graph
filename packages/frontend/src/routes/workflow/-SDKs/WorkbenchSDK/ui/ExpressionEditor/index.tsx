import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { debounce } from 'lodash'
import type { BeforeMount } from '@monaco-editor/react'
import type { Airlock, Workflow } from '@pretzel-graph/shared/domain';
import { Dialog, ScrollArea } from '@pretzel-graph/standard-ui/foundations';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import FloatContainer from '@/components/FloatContainer';
import { MonacoEditor } from '@/components/MonacoEditor';
import { AirlockSDK } from '@/routes/workflow/-SDKs/AirlockSDK';
import { buildAirlockDts } from '../CodeEditor/airlockTypes';
import JsonView from 'react18-json-view';
import { WorkbenchSDK } from '../../sdk';

function formatResult(value: unknown) {
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    return value
}

interface Props {
    node: Workflow.Node.Raw,
    displayName: string,
    onChange: (val: string) => void,
    onClose: () => void,
    initialValue: string,
    // editing an item-scoped field → expose $item / $itemIndex in autocomplete
    itemScoped?: boolean,
}

export const ExpressionEditor = ({ node, displayName, onChange, onClose, initialValue, itemScoped }: Props) => {
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

    const hyNode = WorkbenchSDK.useNode(node.id)

    if (!hyNode){
        return null;
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full">
            <div className="flex-col relative gap-2 h-full flex-1 overflow-hidden">
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
                </ScrollArea.Root>
            </div>
        </div>
    )
}
