import z from "zod";
import { Workflow } from "../Workflow";
import { Realtime } from "../Realtime";
import { Publication } from "./publication";

// Emitted by the backend when a publication is created or removed.
export namespace Signal {
    export const Channel = Realtime.Channel.brand("VersionControl.Signal.Channel")
    export type Channel = z.infer<typeof Channel>

    export const Action = z.enum(["published", "removed"])
    export type Action = z.infer<typeof Action>

    export const getChannel = (workflowId: Workflow.Id, action: Action): Channel =>
        `version_control:${workflowId}:${action}` as Channel

    export const PATTERN_CHANNEL = "version_control:*" as Channel;

    export const Base = Realtime.Signal.Base.extend({
        workflowId: Workflow.Id,
        publicationId: Publication.Id,
    })

    export namespace Published {
        export const Schema = Base.extend({
            type: z.literal("published"),
        })
    }
    export type Published = z.infer<typeof Published.Schema>

    export namespace Removed {
        export const Schema = Base.extend({
            type: z.literal("removed"),
        })
    }
    export type Removed = z.infer<typeof Removed.Schema>

    export const Schema = z.discriminatedUnion("type", [
        Published.Schema,
        Removed.Schema,
    ])
}
export type Signal = z.infer<typeof Signal.Schema>
