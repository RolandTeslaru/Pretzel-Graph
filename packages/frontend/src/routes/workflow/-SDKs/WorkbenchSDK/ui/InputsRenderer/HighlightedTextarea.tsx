
import React, { useMemo } from 'react';
import { cn } from '@pretzel-graph/standard-ui/utils/cn';
import { Button, Dialog } from '@pretzel-graph/standard-ui/foundations';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK';
import type { Foundations, Workflow } from '@pretzel-graph/shared/domain';
import { WorkbenchSDK } from '../../sdk';

interface HighlightedTextareaProps extends React.ComponentProps<"textarea"> {
    input: Foundations.Port.Input
    nodeId: Workflow.Node.Id
    showExpansionButton?: boolean
}

export const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({ className, value, input, nodeId, showExpansionButton = true, ...props }) => {
    const text = String(value || "");

    const highlights = useMemo(() => {
        const regex = /(\$\{[a-zA-Z0-9_]+\})/g;
        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (part.match(regex)) {
                return (
                    <span key={index} className="bg-primary/20 py-0.5 rounded-sm text-primary font-medium">
                        {part}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    }, [text]);

    // Shared styles that MUST match between backdrop and textarea
    const sharedClasses = "font-sans text-base md:text-sm whitespace-pre-wrap break-words leading-snug px-3 py-2";

    return (
        <div
            className={cn(
                // Outer wrapper for border/focus styles
                "relative w-full rounded-md border border-border shadow-sm shadow-black/10 transition-[color,box-shadow]",
                "bg-input/50 overflow-hidden!",
                "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] overflow-hidden",
                className
            )}
        >
            {/* Scrollable container */}
            <div className="overflow-auto min-h-16 max-h-[50vh]">
                {/* Grid to stack backdrop and textarea */}
                <div className="grid">
                    {/* Backdrop Layer (Text & Highlights) */}
                    <div
                        aria-hidden="true"
                        className={cn(
                            sharedClasses,
                            "col-start-1 row-start-1 pointer-events-none select-none text-foreground",
                        )}
                    >
                        {highlights}
                        {text.endsWith('\n') && <br />}
                    </div>

                    {/* Foreground Layer (Input & Caret) */}
                    <textarea
                        value={text}
                        className={cn(
                            sharedClasses,
                            "col-start-1 row-start-1",
                            "bg-transparent text-transparent caret-foreground",
                            "resize-none outline-none border-none w-full field-sizing-content",
                        )}
                        spellCheck={false}
                        autoCorrect="off"
                        {...props}
                    />
                </div>
            </div>
            {showExpansionButton &&
                <Button variant="input" size="icon-xs" className="right-0 bottom-0 rounded-none! rounded-tl-md! absolute"
                    onClick={() => {
                        DialogSDK.actions.push("highlighAreaTextInputDialog", (dialogProps) => (
                            <DialogSDK.Template {...dialogProps} className='min-w-[60vw] max-h-[85vh]'>
                                <ExpandedDialogContent onChange={props.onChange} nodeId={nodeId} input={input} />
                            </DialogSDK.Template>
                        ))
                    }}
                >
                    <SystemIcons.Maximize2 />
                </Button>
            }
        </div>
    )
}


const ExpandedDialogContent = ({ input, nodeId, onChange }: { input: Foundations.Port.Input, nodeId: Workflow.Node.Id, onChange: HighlightedTextareaProps["onChange"] }) => {
    const [value] = WorkbenchSDK.useInput<string>(nodeId, input)
    return (
        <div className='flex flex-col gap-2 p-3 pt-3'>
            <Dialog.Title>Text Area</Dialog.Title>
            <HighlightedTextarea value={value} input={input} nodeId={nodeId} onChange={onChange} showExpansionButton={false} className='min-h-[45vh]' />
        </div>
    )
}