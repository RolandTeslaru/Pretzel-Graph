import z from "zod";
import { Workflow } from "../Workflow";
import { Realtime } from "../Realtime";
import { Publication } from "../VersionControl/publication";

// Emitted by the backend when a workflow's deployed publication changes.
export namespace Signal {
    export const Channel = Realtime.Channel.brand("Deployment.Signal.Channel")
    export type Channel = z.infer<typeof Channel>

    export const Action = z.enum(["deployed", "undeployed"])
    export type Action = z.infer<typeof Action>

    export const getChannel = (workflowId: Workflow.Id, action: Action): Channel =>
        `deployment:${workflowId}:${action}` as Channel

    export const PATTERN_CHANNEL = "deployment:*" as Channel;

    // Names the workflow only; subscribers re-read the deployed publication from the database.
    export const Base = Realtime.Signal.Base.extend({
        workflowId: Workflow.Id,
        publicationId: Publication.Id,
    })

    export namespace Deployed {
        export const Schema = Base.extend({
            type: z.literal("deployed"),
        })
    }
    export type Deployed = z.infer<typeof Deployed.Schema>

    export namespace Undeployed {
        export const Schema = Base.extend({
            type: z.literal("undeployed"),
        })
    }
    export type Undeployed = z.infer<typeof Undeployed.Schema>

    export const Schema = z.discriminatedUnion("type", [
        Deployed.Schema,
        Undeployed.Schema,
    ])
}
export type Signal = z.infer<typeof Signal.Schema>
