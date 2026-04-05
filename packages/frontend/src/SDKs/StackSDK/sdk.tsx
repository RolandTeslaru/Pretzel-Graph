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
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import StackDebugPanel from "./ui/StackDebugPanel";

enableMapSet()

@SDK("Stack")
export class StackSDKImpl extends BaseSDK<StackSDK.State> {

    constructor() { super() }

    public readonly EXIT_ANIMATION_MS = 400

    public readonly useStore: BaseSDK.Store<StackSDK.State> = createWithEqualityFn(
        immer<StackSDK.State>(() => ({
            panels: new Map()
        })),
        shallow
    )

    public readonly reducers: StackSDK.Reducers = stackReducers;
    public readonly actions: StackSDK.Actions = _createStackActions_(this);
    public readonly selectors = {
        doesEntryHaveCompanion: (state: StackSDK.State, panelId: string, companionId: string) => {
            const entry = state.panels.get(panelId)
            if (!entry) return false
            return entry.companions.has(companionId)
        }
    }

    public readonly UIOverlay: StackSDK.UILayer = memo(() => {

        // Object.is instead of shallow — shallow compares Map contents (ignoring insertion order),
        // so bringToFront reorders wouldn't trigger a re-render.
        const panels = (this.useStore as any)((state: StackSDK.State) => state.panels, Object.is) as StackSDK.State['panels']

        const entries = Array.from(panels)
        const stackSize = entries.length

        return (
            <>
                <AnimatePresence>
                    {entries.map(([panelId, entry], index) => {
                        if (!entry.isOpen) return null
                        const depth = index - (stackSize - 1)
                        const isFront = depth === 0
                        return (
                            <React.Fragment key={panelId}>
                                {entry.renderer({ entry: { panelId: entry.panelId, isOpen: entry.isOpen }, stackSize, index })}
                                
                                {Array.from(entry.companions).map(([companionId, companion]) => (
                                    <React.Fragment key={companionId}>
                                        {companion.renderer({ stackSize, index, isFront, parentPanelId: panelId })}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        )
                    })}
                </AnimatePresence>
            </>
        )
    })

    public readonly Template: StackSDK.Template = ({ children, entry, stackSize, index, className }) => {

        const depth = index - (stackSize - 1);        // 0 = front, -1 = one behind, etc.
        const xOffset = depth * -24;                      // shift right 24px per level
        const yOffset = depth * 48;                      // shift right 24px per level
        const scale = 1 + depth * 0.03;                // shrink 3% per level
        const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1);  // darken behind panels

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
                    filter: `brightness(calc(1 - (1 - ${brightnessBase}) * var(--stack-depth-dim-mult, 0.08)))`,
                }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 20 + index }}
                onClick={handleClick}
                className={`
                    overflow-hidden
                    ${className || ''}
                    fixed flex flex-col right-5 top-24 bottom-24 w-87.5 bg-card/70 backdrop-blur-lg 
                    border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
                    [--stack-depth-dim-mult:0.3] dark:[--stack-depth-dim-mult:1]
                    ${!isFront ? 'cursor-pointer' : ''}
                `}
            >
                {children}
            </motion.div>
        )
    }

    private static readonly ENTER_VECTORS: Record<StackSDK.EnterDirection, { x?: string; y?: string }> = {
        left:   { x: "-100%" },
        right:  { x: "100%" },
        top:    { y: "-100%" },
        bottom: { y: "100%" },
    }

    public readonly CompanionTemplate: StackSDK.CompanionTemplate = ({ children, stackSize, index, isFront, className, enter = "left", parentPanelId }) => {

        const depth = index - (stackSize - 1)
        const xOffset = depth * -24
        const yOffset = depth * 48
        const scale = 1 + depth * 0.03
        const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1)
        const enterVector = StackSDKImpl.ENTER_VECTORS[enter]

        const handleClick = () => {
            if (!isFront)
                StackSDK.actions.bringToFront(parentPanelId)
        }

        return (
            <motion.div
                layout
                onClick={handleClick}
                initial={{ ...enterVector, opacity: 0 }}
                animate={{
                    x: xOffset,
                    y: yOffset,
                    opacity: 1,
                    scale: scale,
                    filter: `brightness(calc(1 - (1 - ${brightnessBase}) * var(--stack-depth-dim-mult, 0.08)))`,
                }}
                exit={{ ...enterVector, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 19 + index }}
                className={`
                    overflow-hidden
                    ${className || ''}
                    fixed flex flex-col bg-card/70 backdrop-blur-lg
                    border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
                    [--stack-depth-dim-mult:0.3] dark:[--stack-depth-dim-mult:1]
                    ${!isFront ? 'cursor-pointer' : ''}
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
        companions: Map<string, CompanionEntry>
    }

    export type CompanionEntry = {
        companionId: string
        renderer: CompanionRenderer
    }

    export type Renderer = (props: TemplateProps) => React.ReactNode
    export type CompanionRenderer = (props: CompanionTemplateProps) => React.ReactNode

    export interface TemplateProps {
        className?: string
        children?: React.ReactNode
        entry: Omit<PanelEntry, "renderer" | "companions">
        stackSize: number
        index: number
    }

    export type EnterDirection = "left" | "right" | "top" | "bottom"

    export interface CompanionTemplateProps {
        className?: string
        children?: React.ReactNode
        stackSize: number
        index: number
        isFront: boolean
        enter?: EnterDirection
        parentPanelId: string
    }

    export type UILayer = React.FC
    export type Template = React.FC<TemplateProps>
    export type CompanionTemplate = React.FC<CompanionTemplateProps>
    export type Actions = _StackSDKActions_
    export type Reducers = typeof stackReducers
}
