import { createWithEqualityFn } from "zustand/traditional"
import { shallow } from "zustand/shallow"
import { immer } from "zustand/middleware/immer"
import type { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base"
import type { Workflow } from "@pretzel-graph/shared/domain"

/** Dev switch: play the arrival for every node created by hand too, not only a run's. */
export const ANIMATE_EVERY_CREATE = false

/** How long a node takes to fly in. Keep in step with the node-arrive animation in the preset. */
const ARRIVE_MS     = 2000
const STEP          = 400
const MAX_LOOKAHEAD = 4000
const MOVE_MS       = 700

/** Waiting its turn, flying in, landed. */
export type NodeAnimation = "pending" | "arriving" | "settled"

export type AnimationState = {
    nodes: Record<Workflow.Node.Id, NodeAnimation>,
}

const ARRIVE_VARIANTS = 6

// Which direction a node flies in from, hashed off its id so a remount keeps the same one.
const arriveVariant = (nodeId: Workflow.Node.Id): string => {
    let hash = 0

    for (let i = 0; i < nodeId.length; i++)
        hash = (hash * 31 + nodeId.charCodeAt(i)) | 0

    return `arrive-from-${Math.abs(hash) % ARRIVE_VARIANTS + 1}`
}

// A node no run created wears the plain mount fade instead.
const MOUNT_CLASS = "animate-in fade-in-0 duration-200 ease-out"

export const animationClass = (phase: NodeAnimation | undefined, nodeId: Workflow.Node.Id): string => {
    switch (phase) {
        case "pending":  return "opacity-0"
        case "arriving": return `animate-node-arrive ${arriveVariant(nodeId)}`
        case "settled":  return ""
        default:         return MOUNT_CLASS
    }
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const createAnimationStore = (): BaseSDK.Store<AnimationState> =>
    createWithEqualityFn(immer<AnimationState>(() => ({ nodes: {} })), shallow)

/**
 * Paces the entrances of the nodes a run creates. Each create books the next slot, and the phase
 * a node's body renders in is driven from here, so a burst walks onto the canvas one at a time
 * rather than landing all at once. The timers hang off the schedule rather than off a mounted
 * component, so a node can mount, unmount and mount again without losing its turn.
 */
export class AnimationScheduler {

    private readonly timers      = new Map<Workflow.Node.Id, number[]>()
    private readonly settleTimes = new Map<Workflow.Node.Id, number>()

    private nextRevealAt = 0

    constructor(private readonly store: BaseSDK.Store<AnimationState>) {}

    /** Books the next slot for a node the document is about to receive. */
    public schedule(nodeId: Workflow.Node.Id): void {
        if (prefersReducedMotion())
            return

        const now      = performance.now()
        const revealAt = Math.min(Math.max(now, this.nextRevealAt), now + MAX_LOOKAHEAD)
        const delay    = revealAt - now

        this.nextRevealAt = revealAt + STEP

        this.settleTimes.set(nodeId, revealAt + ARRIVE_MS)
        this.setPhase(nodeId, "pending")

        this.timers.set(nodeId, [
            window.setTimeout(() => this.setPhase(nodeId, "arriving"), delay),
            window.setTimeout(() => this.setPhase(nodeId, "settled"),  delay + ARRIVE_MS),
        ])
    }

    // A node flying in is drawn away from where its handles were measured, so an edge waits for
    // both of its ends to land before it draws.
    public settleDelay(nodeIds: Workflow.Node.Id[]): number {
        const now = performance.now()

        let settledAt = 0

        for (const nodeId of nodeIds)
            settledAt = Math.max(settledAt, this.settleTimes.get(nodeId) ?? 0)

        return Math.max(0, settledAt - now)
    }

    public clear(): void {
        for (const timers of this.timers.values())
            timers.forEach(window.clearTimeout)

        this.timers.clear()
        this.settleTimes.clear()

        this.nextRevealAt = 0

        this.store.setState(s => { s.nodes = {} })
    }

    private setPhase(nodeId: Workflow.Node.Id, phase: NodeAnimation): void {
        this.store.setState(s => { s.nodes[nodeId] = phase })

        if (phase !== "settled")
            return

        this.timers.delete(nodeId)
        this.settleTimes.delete(nodeId)
    }
}

// XYFlow writes a node's position onto its wrapper as a transform, so a transition on that
// wrapper is what turns a run's move into a glide. Applied before the position changes.
export const animateNodeMove = (nodeId: Workflow.Node.Id): void => {
    if (prefersReducedMotion())
        return

    const element = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`)

    if (!element)
        return

    element.style.transition = `transform ${MOVE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

    window.setTimeout(() => { element.style.transition = "" }, MOVE_MS)
}
