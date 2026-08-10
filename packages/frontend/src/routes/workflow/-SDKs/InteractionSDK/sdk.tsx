import React, { memo } from "react";
import { immer } from "zustand/middleware/immer"
import { enableMapSet } from 'immer';
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { AnimatePresence, motion } from "motion/react";
import { TimeoutRing } from "@pretzel-graph/standard-ui/components/TimeoutRing";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { _createInteractionActions_, type _InteractionSDKActions_ } from "./actions";
import { interactionReducers } from "./reducers";

enableMapSet()

// Memo boundary per entry so a stack mutation (any push/pop/reorder) stops cascading
// into every card's content.
const InteractionEntry = memo(({ interaction, stackSize, index }: {
    interaction: InteractionSDK.Interaction
    stackSize: number
    index: number
}) => <>{interaction.renderer({ interaction, stackSize, index })}</>)

@SDK("Interaction")
export class InteractionSDKImpl extends BaseSDK<InteractionSDK.State> {

    constructor() { super() }

    // Insertion order = stack order; the LAST interaction is the front card.
    public readonly useStore: BaseSDK.Store<InteractionSDK.State> = createWithEqualityFn(
        immer<InteractionSDK.State>(() => ({
            interactions: new Map()
        })),
        shallow
    )

    public readonly reducers: InteractionSDK.Reducers = interactionReducers;
    public readonly actions: InteractionSDK.Actions = _createInteractionActions_(this);
    public readonly selectors = {};

    public readonly UIOverlay: InteractionSDK.UILayer = memo(() => {

        // Object.is instead of shallow — shallow compares Map contents (ignoring insertion
        // order), so bringToFront reorders wouldn't trigger a re-render.
        const interactionsMap = (this.useStore as any)(
            (state: InteractionSDK.State) => state.interactions, Object.is,
        ) as InteractionSDK.State['interactions']

        const interactions = Array.from(interactionsMap)
        const stackSize = interactions.length

        return (
            <AnimatePresence>
                {interactions.map(([interactionId, interaction], index) => (
                    <InteractionEntry
                        key={interactionId}
                        interaction={interaction}
                        stackSize={stackSize}
                        index={index}
                    />
                ))}
            </AnimatePresence>
        )
    })

    // Bottom-centred card chrome. Stack position derives from `index` (last = front).
    // Passing `timeout` opts the card into the depleting countdown ring.
    public readonly Template: InteractionSDK.Template = ({ children, interaction, stackSize, index, className, timeout }) => {

        const depth = index - (stackSize - 1)          // 0 = front, -1 behind, …
        const yOffset = depth * 37
        const scale = 1 + depth * 0.03
        const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1)
        const brightness = 1 - (1 - brightnessBase) * 0.3
        const isFront = depth === 0

        const handleClick = () => {
            if (!isFront)
                InteractionSDK.actions.bringToFront(interaction.id)
        }

        return (
            <motion.div
                layout
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: yOffset, opacity: 1, scale, filter: `brightness(${brightness})` }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 20 + index }}
                onClick={handleClick}
                className={`
                    overflow-hidden fixed flex flex-col left-1/2 -translate-x-1/2 bottom-22 w-87.5 backdrop-blur-md bg-black/90 dark:bg-white/90
                    rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
                    ${!isFront ? "cursor-pointer" : ""}
                    ${className || ''}
                `}
            >
                {timeout && (
                    <TimeoutRing
                        className="absolute top-3 right-3 text-white dark:text-black"
                        createdAt={timeout.createdAt}
                        timeoutMs={timeout.timeoutMs}
                        onExpire={timeout.onExpire}
                    />
                )}

                {children}
            </motion.div>
        )
    }
}

export const InteractionSDK = SDK.get<InteractionSDKImpl>("Interaction")


export namespace InteractionSDK {
    export type State = {
        interactions: Map<Interaction.Id, Interaction>
    }

    export namespace Interaction {
        export type Id = string & { __brand: "interactionId" }
        export type Renderer = (props: TemplateProps) => React.ReactNode
    }
    export interface Interaction {
        id: Interaction.Id
        renderer: Interaction.Renderer
    }

    // Opt-in countdown. Omit it and the card renders no ring.
    export interface Timeout {
        createdAt: number
        timeoutMs: number
        onExpire: () => void
    }

    export interface TemplateProps {
        className?: string
        children?: React.ReactNode
        interaction: Interaction
        stackSize: number
        index: number
        timeout?: Timeout
    }

    export type UILayer = React.FC
    export type Template = React.FC<TemplateProps>
    export type Actions = _InteractionSDKActions_
    export type Reducers = typeof interactionReducers
}
