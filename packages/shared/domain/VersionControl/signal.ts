import z from "zod";
import { Workflow } from "../Workflow";
import { Realtime } from "../Realtime";
import { Publication } from "./publication";

// Signals are emitted by the backend when a publication changes state.
// Subscribers (e.g. the webhook server) use them to keep caches in sync.
export namespace Signal {
    export const Channel = Realtime.Channel.brand("VersionControl.Signal.Channel")
    export type Channel = z.infer<typeof Channel>

    export const Action = z.enum(["published", "activated", "deactivated", "removed"])
    export type Action = z.infer<typeof Action>

    export const getChannel = (workflowId: Workflow.Id, action: Action): Channel =>
        `version_control:${workflowId}:${action}` as Channel

    export const PATTERN_CHANNEL = "version_control:*" as Channel;

    export const Base = Realtime.Signal.Base.extend({
        workflowId: Workflow.Id,
        publicationId: Publication.Id,
    })

    // No publication payload — the signal is only a nudge naming the workflow. A subscriber
    // re-reads the active publication from the DB (the authoritative source), so a signal can
    // neither be trusted nor forged into registering arbitrary routes.
    export namespace Published {
        export const Schema = Base.extend({
            type: z.literal("published"),
        })
    }
    export type Published = z.infer<typeof Published.Schema>

    export namespace Activated {
        export const Schema = Base.extend({
            type: z.literal("activated"),
        })
    }
    export type Activated = z.infer<typeof Activated.Schema>

    export namespace Deactivated {
        export const Schema = Base.extend({
            type: z.literal("deactivated"),
        })
    }
    export type Deactivated = z.infer<typeof Deactivated.Schema>

    export namespace Removed {
        export const Schema = Base.extend({
            type: z.literal("removed"),
        })
    }
    export type Removed = z.infer<typeof Removed.Schema>

    export const Schema = z.discriminatedUnion("type", [
        Published.Schema,
        Activated.Schema,
        Deactivated.Schema,
        Removed.Schema,
    ])
}
export type Signal = z.infer<typeof Signal.Schema>
