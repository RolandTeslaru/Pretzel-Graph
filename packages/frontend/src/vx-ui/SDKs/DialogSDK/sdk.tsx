import { memo, useState, useEffect } from "react";
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { enableMapSet } from 'immer';
import { BaseSDK } from "../Base";
import { AlertDialog, Dialog } from "../../foundations";
import { SDK } from "@/SDKs/SDKManager";
import { type _DialogSDKActions_, createDialogSDKActions } from "./actions";
import { AlertTriangle } from "@/vx-ui/icons/system";

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
            dialogs: new Map()
        }))
    )

    public readonly UIOverlay: DialogSDK.UILayer = memo(() => {

        const dialogs = this.useStore(state => state.dialogs)

        return (<>
            {Array.from(dialogs).map(([dialogId, entry], index) =>
                <React.Fragment key={dialogId}>
                    {entry.renderer({ entry, dialogsSize: dialogs.size, index })}
                </React.Fragment>
            )}
        </>)
    })

    public readonly actions = createDialogSDKActions(this);

    public readonly Template: DialogSDK.Template = ({ children, entry, dialogsSize, index, className }) => {
        const delayStyle = useAnimationDelay();
        const scale_offset = (index - (dialogsSize - 1)) * 8;
        const y_offset = (index - (dialogsSize - 1)) * 40;
        const finalScale = 1 + scale_offset / 100;

        return (
            <Dialog.Root
                open={entry.isOpen}
                onOpenChange={() => DialogSDK.actions.pop(entry.dialogId)}
            >
                <Dialog.Content
                    style={{
                        ...delayStyle,
                        transform: `translate(-50%, -50%) translateY(${y_offset}px) scale(${finalScale})`,
                        filter: `brightness(${1 / -(index - dialogsSize)})`,
                    }}
                    darkenBackground={index === 0}
                    blockTransparency={dialogsSize - index > 1}
                    className={className}
                >
                    {children}
                </Dialog.Content>
            </Dialog.Root>
        )
    }


    public readonly AlertTemplate: DialogSDK.AlertTemplate = ({ children, entry, dialogsSize, index, className, onCancel, onApprove, type = "warning" }) => {
        const delayStyle = useAnimationDelay();
        const scale_offset = (index - (dialogsSize - 1)) * 8;
        const y_offset = (index - (dialogsSize - 1)) * 40;
        const finalScale = 1 + scale_offset / 100;

        const isWarning = type === "warning"
        const isDanger = type === "danger"

        return (
            <AlertDialog.Root open={entry.isOpen} onOpenChange={() => DialogSDK.actions.pop(entry.dialogId)}>
                <AlertDialog.Content
                    style={{
                        ...delayStyle,
                        transform: `translate(-50%, -50%) translateY(${y_offset}px) scale(${finalScale})`,
                        filter: `brightness(${1 / -(index - dialogsSize)})`,
                    }}
                    darkenBackground={index === 0}
                    blockTransparency={dialogsSize - index > 1}
                    className={`flex flex-row max-w-[600px] ${className || ""}`}
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
                                Cancel
                            </AlertDialog.Cancel>
                            <AlertDialog.Action
                                onClick={(event) => onApprove?.(event, entry, dialogsSize, index)}
                                variant={type === "danger" ? "destructive" : type}
                            >
                                Approve
                            </AlertDialog.Action>
                        </AlertDialog.Footer>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Root>
        )
    }

}

export const DialogSDK = SDK.get<DialogSDKImpl>("Dialog")


export namespace DialogSDK {
    export type State = {
        dialogs: Map<string, Entry>
    }
    export type actions = _DialogSDKActions_

    export type UILayer = React.FC

    export type Entry = {
        dialogId: string
        isOpen: boolean
        renderer: Renderer
    }
    export type Renderer = (props: TemplateProps) => React.ReactNode


    export interface AlertTemplateProps extends TemplateProps {
        type: "default" | "warning" | "danger"
    }

    export interface TemplateProps {
        className?: string
        children?: React.ReactNode
        entry: Omit<Entry, "renderer">,
        dialogsSize: number
        index: number
        onCancel?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, entry: Omit<Entry, "renderer">, dialogsSize: number, index: number) => void
        onApprove?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, entry: Omit<Entry, "renderer">, dialogsSize: number, index: number) => void
    }

    export type Template = React.FC<TemplateProps>
    export type UnstyledTemplate = React.FC<TemplateProps>
    export type AlertTemplate = React.FC<AlertTemplateProps>
}