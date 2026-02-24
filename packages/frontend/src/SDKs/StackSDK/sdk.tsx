import { memo } from "react";
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import React from "react";
import { enableMapSet } from 'immer';
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { _createStackActions_, type _StackSDKActions_ } from "./actions";
import { stackReducers } from "./reducers";
import { AnimatePresence, motion } from "motion/react";

enableMapSet()

@SDK("Stack")
export class StackSDKImpl extends BaseSDK<StackSDK.State> {

    constructor() { super() }

    public readonly EXIT_ANIMATION_MS = 400

    public readonly useStore: BaseSDK.Store<StackSDK.State> = create(
        immer<StackSDK.State>(() => ({
            panels: new Map()
        }))
    )

    public readonly reducers: StackSDK.Reducers = stackReducers;
    public readonly actions: StackSDK.Actions = _createStackActions_(this);

    public readonly UIOverlay: StackSDK.UILayer = memo(() => {

        const panels = this.useStore(state => state.panels)

        const entries = Array.from(panels)
        const stackSize = entries.length

        return (
            <AnimatePresence>
                {entries.map(([panelId, entry], index) => {
                    if (!entry.isOpen) return null
                    return (
                        <React.Fragment key={panelId}>
                            {entry.renderer({ entry, stackSize, index })}
                        </React.Fragment>
                    )
                })}
            </AnimatePresence>
        )
    })

    public readonly Template: StackSDK.Template = ({ children, entry, stackSize, index, className }) => {

        const depth = index - (stackSize - 1);        // 0 = front, -1 = one behind, etc.
        const xOffset = depth * -24;                      // shift right 24px per level
        const yOffset = depth * 48;                      // shift right 24px per level
        const scale = 1 + depth * 0.03;                // shrink 3% per level
        const brightness = depth === 0 ? 1 : 1 / -(depth - 1);  // darken behind panels

        const isFront = depth === 0;

        const handleClick = () => {
            if (!isFront)
                StackSDK.actions.bringToFront(entry.panelId)
        }

        return (
            <motion.div
                layout
                initial={{ x: "100%", opacity: 0 }}
                animate={{
                    x: xOffset,
                    y: yOffset,
                    opacity: 1,
                    scale: scale,
                    filter: `brightness(${brightness})`,
                }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 20 + index }}
                onClick={handleClick}
                className={`
                    overflow-hidden
                    fixed flex flex-col right-5 top-24 bottom-24 w-87.5 bg-card/80 backdrop-blur-lg 
                    border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
                    ${!isFront ? 'cursor-pointer' : ''}
                    ${className || ''}
                `}
            >
                {children}
            </motion.div>
        )
    }
}

export const StackSDK = SDK.get<StackSDKImpl>("Stack")


export namespace StackSDK {
    export type State = {
        panels: Map<string, PanelEntry>
    }

    export type PanelEntry = {
        panelId: string
        isOpen: boolean
        renderer: Renderer
    }

    export type Renderer = (props: TemplateProps) => React.ReactNode

    export interface TemplateProps {
        className?: string
        children?: React.ReactNode
        entry: Omit<PanelEntry, "renderer">
        stackSize: number
        index: number
    }

    export type UILayer = React.FC
    export type Template = React.FC<TemplateProps>
    export type Actions = _StackSDKActions_
    export type Reducers = typeof stackReducers
}
