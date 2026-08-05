import { memo, useEffect } from "react";
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import React from "react";
import { enableMapSet } from 'immer';
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { _createStackActions_, type _StackSDKActions_ } from "./actions";
import { stackReducers } from "./reducers";
import { AnimatePresence, motion } from "motion/react";
import { useMounted } from "@/hooks/useMounted";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import StackDebugPanel from "./ui/StackDebugPanel";

enableMapSet()

// Memo boundaries so overlay-level re-renders (any stack mutation) stop cascading
// into panel content. Immer keeps untouched panel/companion identities stable, so
// the shallow compare bails for every panel the mutation didn't affect.
const PanelEntry = memo(({ panel, stackSize, index }: {
    panel: StackSDK.Panel
    stackSize: number
    index: number
}) => <>{panel.renderer({ panel, stackSize, index })}</>)

const CompanionEntry = memo(({ companion, parentPanel, stackSize, index, isFront }: {
    companion: StackSDK.Companion
    parentPanel: StackSDK.Panel
    stackSize: number
    index: number
    isFront: boolean
}) => <>{companion.renderer({ stackSize, index, isFront, parentPanel, companion })}</>)

@SDK("Stack")
export class StackSDKImpl extends BaseSDK<StackSDK.State> {

    constructor() { super() }

    public readonly EXIT_ANIMATION_MS = 400
    public readonly STACK_GAP = 15

    public readonly useStore: BaseSDK.Store<StackSDK.State> = createWithEqualityFn(
        immer<StackSDK.State>(() => ({
            panels: new Map()
        })),
        shallow
    )

    public readonly reducers: StackSDK.Reducers = stackReducers;
    public readonly actions: StackSDK.Actions = _createStackActions_(this);
    public readonly selectors = {
        doesEntryHaveCompanion: (state: StackSDK.State, panelId: StackSDK.Panel.Id, companionId: StackSDK.Companion.Id) => {
            const panel = state.panels.get(panelId)
            if (!panel) return false
            return panel.companions.has(companionId)
        }
    }

    public readonly UIOverlay: StackSDK.UILayer = memo(() => {

        // Object.is instead of shallow — shallow compares Map contents (ignoring insertion order),
        // so bringToFront reorders wouldn't trigger a re-render.
        const panelsMap = (this.useStore as any)((state: StackSDK.State) => state.panels, Object.is) as StackSDK.State['panels']

        const panels = Array.from(panelsMap)
        const stackSize = panels.length

        return (
            <>
                <AnimatePresence>
                    {panels.map(([panelId, panel], index) => {
                        if (!panel.isOpen) return null
                        const depth = index - (stackSize - 1)
                        const isFront = depth === 0
                        return (
                            <React.Fragment key={panelId}>
                                <PanelEntry panel={panel} stackSize={stackSize} index={index} />

                                {Array.from(panel.companions).map(([companionId, companion]) => (
                                    <CompanionEntry
                                        key={companionId}
                                        companion={companion}
                                        parentPanel={panel}
                                        stackSize={stackSize}
                                        index={index}
                                        isFront={isFront}
                                    />
                                ))}
                            </React.Fragment>
                        )
                    })}
                </AnimatePresence>
            </>
        )
    })

    public readonly Template: StackSDK.Template = ({ children, panel, stackSize, index, className }) => {

        const depth = index - (stackSize - 1);          // 0 = front, -1 = one behind, etc.
        const baseXOffset = depth * -24;                // shift right 24px per level
        const baseYOffset = depth * 48;                 // shift right 24px per level
        const scale = 1 + depth * 0.03;                 // shrink 3% per level
        const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1);  // darken behind panels
        const brightness = 1 - (1 - brightnessBase) * 0.3


        const isFront = depth === 0;

        const rightShift = (this.useStore as any)((s: StackSDK.State) => {
            const p = s.panels.get(panel.id)
            if (!p) return 0
            let total = 0
            p.companions.forEach(c => {
                if (c.side === "right") total += c.width + this.STACK_GAP
            })
            return total
        }) as number

        const handleClick = () => {
            if (!isFront)
                StackSDK.actions.bringToFront(panel.id)
        }

        // Hold the enter pose until the mount commit has painted — the panel's
        // content mounts while nothing moves, then the spring runs uncontested.
        const mounted = useMounted()

        return (
            <motion.div
                layout
                initial={{ x: "100%", opacity: 0 }}
                animate={mounted ? {
                    x: baseXOffset - rightShift,
                    y: baseYOffset,
                    opacity: 1,
                    scale: scale,
                    filter: `brightness(${brightness})`,
                } : undefined}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 20 + index }}
                onClick={handleClick}
                className={`
                    overflow-hidden
                    ${className || ''}
                    fixed flex flex-col right-5 top-24 bottom-24 w-87.5 bg-card/80 backdrop-blur-lg 
                    border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
                    ${!isFront ? 'cursor-pointer' : ''}
                `}
            >
                {children}
            </motion.div>
        )
    }

    private static readonly ENTER_VECTORS: Record<StackSDK.Side, { x?: string; y?: string }> = {
        left:   { x: "-100%" },
        right:  { x: "100%" },
        top:    { y: "-100%" },
        bottom: { y: "100%" },
    }

    public readonly CompanionTemplate: React.FC<StackSDK.Companion.TemplateProps> = ({ children, stackSize, index, isFront, className, enter = "left", parentPanel, companion }) => {

        const depth = index - (stackSize - 1)
        const xOffset = depth * -24
        const yOffset = depth * 48
        const scale = 1 + depth * 0.03
        const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1)
        const brightness = 1 - (1 - brightnessBase) * 0.3
        const enterVector = StackSDKImpl.ENTER_VECTORS[enter]

        const rightShift = (this.useStore as any)((s: StackSDK.State) => {
            if (companion.side !== "left") return 0
            const p = s.panels.get(parentPanel.id)
            if (!p) return 0
            let total = 0
            p.companions.forEach(c => {
                if (c.side === "right") total += c.width + this.STACK_GAP
            })
            return total
        }) as number

        const handleClick = () => {
            if (!isFront)
                StackSDK.actions.bringToFront(parentPanel.id)
        }

        const mounted = useMounted()

        return (
            <motion.div
                layout
                onClick={handleClick}
                initial={{ ...enterVector, opacity: 0 }}
                animate={mounted ? {
                    x: xOffset - rightShift,
                    y: yOffset,
                    opacity: 1,
                    scale: scale,
                    filter: `brightness(${brightness})`,
                } : undefined}
                exit={{ ...enterVector, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 19 + index }}
                className={`
                    overflow-hidden
                    ${className || ''}
                    fixed flex flex-col bg-card/80 backdrop-blur-lg
                    border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
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
        panels: Map<Panel.Id, Panel>
    }

    export type Side = "left" | "right" | "top" | "bottom"



    export namespace Companion {
        export type Id = string & { __brand: "companionId" }

        export interface TemplateProps {
            className?: string
            children?: React.ReactNode
            stackSize: number
            index: number
            isFront: boolean
            parentPanel: Panel
            companion: Companion
            enter?: "left" | "right" | "top" | "bottom"
        }
        export type Renderer = (props: Companion.TemplateProps) => React.ReactNode
    }
    export interface Companion {
        id: Companion.Id
        renderer: Companion.Renderer,
        side: Side
        width: number
    }



    export namespace Panel {
        export type Id = string & { __brand: "panelId" }
        export type Renderer = (props: TemplateProps) => React.ReactNode
    }
    export interface Panel {
        id: Panel.Id
        isOpen: boolean
        renderer: Panel.Renderer
        companions: Map<Companion.Id, Companion>
        offset: { x: number, y: number }
    }


    

    export interface TemplateProps {
        className?: string
        children?: React.ReactNode
        panel: Panel
        stackSize: number
        index: number
    }
    

    export type UILayer = React.FC
    export type Template = React.FC<TemplateProps>
    export type Actions = _StackSDKActions_
    export type Reducers = typeof stackReducers
}
