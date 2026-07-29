import { memo, useState, useEffect } from "react";
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import React from "react";
import { enableMapSet } from 'immer';
import { BaseSDK } from "../Base";
import { AlertDialog, Dialog } from "@pretzel-graph/standard-ui/foundations";
import { SDK } from "@/SDKs/SDKManager";
import { type _DialogSDKActions_, createDialogSDKActions } from "./actions";
import { AlertTriangle } from "@pretzel-graph/standard-ui/icons/system";
import { dialogSelectors, type DialogSDKSelectors } from "./selectors";

enableMapSet()

/**
 * Delays the dialog's CSS entry animation so heavy children can mount
 * invisibly first (at opacity 0 via animation-fill-mode: both).
 * After mount + delay, the animation plays smoothly.
 * The delay is removed once the entry animation finishes so exit isn't affected.
 */
const ENTRY_DELAY_MS = 300
const ENTRY_ANIMATION_MS = 400

function useAnimationDelay(): React.CSSProperties {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        const timer = setTimeout(
            () => setEntered(true),
            ENTRY_DELAY_MS + ENTRY_ANIMATION_MS
        );
        return () => clearTimeout(timer);
    }, []);

    if (!entered) {
        return {
            animationDelay: `${ENTRY_DELAY_MS}ms`,
            animationFillMode: 'both',
        };
    }
    return {};
}

@SDK("Dialog")
export class DialogSDKImpl extends BaseSDK<DialogSDK.State> {

    constructor() { super() }

    public readonly EXIT_ANIMATION_MS = 400

    public readonly useStore = create<DialogSDK.State>()(
        immer(() => ({
            dialogs: new Map(),
            selectors: dialogSelectors,
        }))
    )

    public readonly selectors: DialogSDK.Selectors = dialogSelectors

    public readonly UIOverlay: DialogSDK.UILayer = memo(() => {

        const dialogs = this.useStore(state => state.dialogs)

        return (<>
            {Array.from(dialogs).map(([dialogId, entry], index) => {
                const dialogsSize = dialogs.size
                return (
                    <React.Fragment key={dialogId}>
                        {entry.renderer({
                            entry,
                            dialogsSize,
                            index,
                            blockTransparency: dialogsSize - index > 1,
                            // Stack-darkening brightness for this depth (animated). UnstyledTemplate
                            // callers apply this on their own surfaces (the styled Template applies it on
                            // its wrapper instead).
                            surfaceStyle: {
                                filter: `brightness(${1 / (dialogsSize - index)})`,
                                transition: "filter 400ms ease-in-out",
                            },
                        })}
                    </React.Fragment>
                )
            })}
        </>)
    })

    public readonly actions = createDialogSDKActions(this);

    public readonly Template: DialogSDK.Template = ({ children, entry, dialogsSize, index, blockTransparency, className, dismissible = true }) => {
        const delayStyle = useAnimationDelay();
        const scale_offset = (index - (dialogsSize - 1)) * 8;
        const y_offset = (index - (dialogsSize - 1)) * 40;
        const finalScale = 1 + scale_offset / 100;

        const blockDismiss = dismissible ? undefined : (e: Event) => e.preventDefault();

        return (
            <Dialog.Root
                open={entry.isOpen}
                onOpenChange={() => { if (dismissible) DialogSDK.actions.pop(entry.dialogId) }}
            >
                <Dialog.Content
                    style={{
                        ...delayStyle,
                        transform: `translate(-50%, -50%) translateY(${y_offset}px) scale(${finalScale})`,
                        // Stack-darkening lives on the wrapper here (single-surface dialog, nothing
                        // nested to trap). UnstyledTemplate omits it and hands `surfaceStyle` to the caller.
                        filter: `brightness(${1 / (dialogsSize - index)})`,
                    }}
                    darkenBackground={index === 0}
                    blockTransparency={blockTransparency}
                    className={className}
                    onInteractOutside={blockDismiss}
                    onEscapeKeyDown={blockDismiss}
                >
                    {children}
                </Dialog.Content>
            </Dialog.Root>
        )
    }


    public readonly AlertTemplate: DialogSDK.AlertTemplate = ({ children, entry, dialogsSize, index, blockTransparency, className, onCancel, onApprove, cancelLabel = "Cancel", approveLabel = "Approve", type = "warning", dismissible = true }) => {
        const delayStyle = useAnimationDelay();
        const scale_offset = (index - (dialogsSize - 1)) * 8;
        const y_offset = (index - (dialogsSize - 1)) * 40;
        const finalScale = 1 + scale_offset / 100;

        const isWarning = type === "warning"
        const isDanger = type === "danger"

        const blockDismiss = dismissible ? undefined : (e: Event) => e.preventDefault();

        return (
            <AlertDialog.Root open={entry.isOpen} onOpenChange={() => { if (dismissible) DialogSDK.actions.pop(entry.dialogId) }}>
                <AlertDialog.Content
                    style={{
                        ...delayStyle,
                        transform: `translate(-50%, -50%) translateY(${y_offset}px) scale(${finalScale})`,
                        filter: `brightness(${1 / -(index - dialogsSize)})`,
                    }}
                    darkenBackground={index === 0}
                    blockTransparency={blockTransparency}
                    className={`flex flex-row max-w-[600px] ${className || ""}`}
                    onEscapeKeyDown={blockDismiss}
                >
                    {type === "danger" &&
                        <div className="relative pl-9 pr-5 pt-9 mb-auto">
                            <div className="relative">
                                <AlertTriangle size={60} className={"text-destructive!"} />
                                <AlertTriangle size={60} className={`animate-ping absolute top-0 left-0 !text-destructive`} />
                            </div>
                        </div>
                    }
                    {
                        type === "warning" &&
                        <div className="relative pl-9 pr-5 pt-9 mb-auto">
                            <div className="relative">
                                <AlertTriangle size={60} className={"!text-yellow-400"} />
                                <AlertTriangle size={60} className={`animate-ping absolute top-0 left-0 !text-yellow-400`} />
                            </div>
                        </div>
                    }
                    <div className="flex flex-col h-full gap-4 p-3 w-full  min-h-[150px]">
                        <div className={`h-full ${(isWarning || isDanger) && "pt-3"} mb-auto`}>
                            {children}
                        </div>
                        <AlertDialog.Footer>
                            <AlertDialog.Cancel onClick={(event) => onCancel?.(event, entry, dialogsSize, index)}>
                                {cancelLabel}
                            </AlertDialog.Cancel>
                            <AlertDialog.Action
                                onClick={(event) => onApprove?.(event, entry, dialogsSize, index)}
                                variant={type === "danger" ? "destructive" : type}
                            >
                                {approveLabel}
                            </AlertDialog.Action>
                        </AlertDialog.Footer>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Root>
        )
    }

    // Chrome-less stacking shell. Applies the stack transform + entry animation but NOT the
    // brightness `filter` — a `filter` on this wrapper would form a backdrop root and trap
    // descendant `backdrop-filter`s. Instead the brightness is handed to children via
    // `surfaceStyle` so they apply it on their own surfaces, where backdrop-blur still works.
    public readonly UnstyledTemplate: DialogSDK.UnstyledTemplate = ({ children, entry, dialogsSize, index, className, dismissible = true }) => {
        const delayStyle = useAnimationDelay();
        const scale_offset = (index - (dialogsSize - 1)) * 8;
        const y_offset = (index - (dialogsSize - 1)) * 40;
        const finalScale = 1 + scale_offset / 100;

        const blockDismiss = dismissible ? undefined : (e: Event) => e.preventDefault();

        return (
            <Dialog.Root
                open={entry.isOpen}
                onOpenChange={() => { if (dismissible) DialogSDK.actions.pop(entry.dialogId) }}
            >
                <Dialog.Content
                    unstyled
                    style={{
                        ...delayStyle,
                        transform: `translate(-50%, -50%) translateY(${y_offset}px) scale(${finalScale})`,
                    }}
                    darkenBackground={index === 0}
                    className={className}
                    onInteractOutside={blockDismiss}
                    onEscapeKeyDown={blockDismiss}
                >
                    {children}
                </Dialog.Content>
            </Dialog.Root>
        )
    }

}

export const DialogSDK = SDK.get<DialogSDKImpl>("Dialog")


export namespace DialogSDK {
    export type State = {
        dialogs: Map<string, Entry>
        selectors: DialogSDKSelectors
    }
    export type Selectors = DialogSDKSelectors
    export type actions = _DialogSDKActions_

    export type UILayer = React.FC

    export type Entry = {
        dialogId: string
        isOpen: boolean
        renderer: Renderer
    }
    export type Renderer = (props: TemplateProps) => React.ReactNode


    export interface AlertTemplateProps extends TemplateProps {
        type?: "default" | "warning" | "danger" | "accent"
        cancelLabel?: React.ReactNode
        approveLabel?: React.ReactNode
    }

    export interface TemplateProps {
        className?: string
        children?: React.ReactNode
        entry: Omit<Entry, "renderer">,
        dialogsSize: number
        index: number
        // True when another dialog is stacked on top of this one — i.e. it sits in the
        // background and should render solid (no transparency / blur).
        blockTransparency: boolean
        // Stack-darkening brightness filter for this dialog's depth. Applied automatically on
        // the styled Template's wrapper; UnstyledTemplate hands it to the caller to apply on
        // its own surfaces (so descendant backdrop-filters aren't trapped).
        surfaceStyle: React.CSSProperties
        dismissible?: boolean
        onCancel?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, entry: Omit<Entry, "renderer">, dialogsSize: number, index: number) => void
        onApprove?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, entry: Omit<Entry, "renderer">, dialogsSize: number, index: number) => void
    }

    export type Template = React.FC<TemplateProps>
    export type AlertTemplate = React.FC<AlertTemplateProps>
    export type UnstyledTemplate = React.FC<TemplateProps>
}
