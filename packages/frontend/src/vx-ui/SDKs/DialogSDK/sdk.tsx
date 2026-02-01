import { memo } from "react";
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import React from "react";
import { enableMapSet } from 'immer';
import { BaseSDK } from "../Base";
import { AlertDialog, Dialog, WindowStyling } from "../../foundations";
import { TRIANGLE_RENDER_MAP } from "./components/triangles";
import { SDK } from "@/SDKs/SDKManager";
import { type _DialogSDKActions_, createDialogSDKActions } from "./actions";

enableMapSet()

@SDK("Dialog")
export class DialogSDKImpl extends BaseSDK<DialogSDK.State> {

    constructor() { super() }

    public readonly EXIT_ANIMATION_MS = 300

    public readonly useStore = create<DialogSDK.State>()(
        immer(() => ({
            dialogs: new Map()
        }))
    )

    public readonly UILayer: DialogSDK.UILayer = memo(() => {

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
        const scale_offset = (index - (dialogsSize - 1)) * 8;
        const y_offset = (index - (dialogsSize - 1)) * 40;
        const finalScale = 1 + scale_offset / 100;

        return (
            <Dialog.Root open={entry.isOpen} onOpenChange={() => DialogSDK.actions.pop(entry.dialogId)}>
                <Dialog.Content
                    style={{
                        transform: `translate(-50%, -50%) translateY(${y_offset}px) scale(${finalScale})`,
                        filter: `brightness(${1 / -(index - dialogsSize)})`,
                    }}
                    darkenBackground={index === 0}
                    blockTransparency={dialogsSize - index > 1}
                >
                    {children}
                </Dialog.Content>
            </Dialog.Root>
        )
    }

    public readonly AlertTemplate: DialogSDK.AlertTemplate = ({ children, entry, dialogsSize, index, className, onCancel, onApprove, type = "warning" }) => {
        const scale_offset = (index - (dialogsSize - 1)) * 8;
        const y_offset = (index - (dialogsSize - 1)) * 40;
        const finalScale = 1 + scale_offset / 100;

        const isWarning = type === "warning"
        const isDanger = type === "danger"

        return (
            <AlertDialog.Root open={entry.isOpen} onOpenChange={() => DialogSDK.actions.pop(entry.dialogId)}>
                <AlertDialog.Content
                    style={{
                        transform: `translate(-50%, -50%) translateY(${y_offset}px) scale(${finalScale})`,
                        filter: `brightness(${1 / -(index - dialogsSize)})`,
                    }}
                    darkenBackground={index === 0}
                    blockTransparency={dialogsSize - index > 1}
                >
                        <div className="flex flex-row gap-4 p-4">
                            <div className="flex flex-col gap-2">
                                <div>
                                    {children}
                                </div>
                                <AlertDialog.Footer>
                                    <AlertDialog.Cancel onClick={(event) => onCancel?.(event, entry, dialogsSize, index)}>
                                        Cancel
                                    </AlertDialog.Cancel>
                                    <AlertDialog.Action onClick={(event) => onApprove?.(event, entry, dialogsSize, index)} variant={type === "danger" ? "destructive" : type}>
                                        Approve
                                    </AlertDialog.Action>
                                </AlertDialog.Footer>
                            </div>
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
        type: "accent" | "warning" | "danger"
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
    export type AlertTemplate = React.FC<AlertTemplateProps>
}