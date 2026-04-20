import z from "zod";
import { Workflow } from "./Workflow";
import { Auth } from "./Auth";
import { Realtime } from "./Realtime";

export namespace VersionControl {
    export namespace Publication {
        export const Id = z.string().brand("PublicationId");
        export type Id = z.infer<typeof Id>

        export const Schema = z.object({
            id: Publication.Id,
            workflow_id: Workflow.Id,
            version: z.number(),
            workflow_data: Workflow.Data.Schema,
            user_id: Auth.User.Id,
            is_active: z.boolean(),
            published_at: z.coerce.date(),
        })
    }
    export type Publication = z.infer<typeof Publication.Schema>

    // Signals are emitted by the backend when a publication changes state.
    // Subscribers (e.g. the webhook server) use them to keep caches in sync.
    export namespace Signal {
        export const Channel = Realtime.Channel.brand("VersionControlChannel")
        export type Channel = z.infer<typeof Channel>

        export const Action = z.enum(["published", "activated", "deactivated", "removed"])
        export type Action = z.infer<typeof Action>

        export const getChannel = (workflowId: Workflow.Id, action: Action): Channel =>
            `version_control:${workflowId}:${action}` as Channel

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

    export namespace API {
        export namespace Publish {
            export const Request = z.object({
                workflowId: Workflow.Id,
                workflowData: Workflow.Data.Schema,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publication: Publication.Schema,
            })
            export type Response = z.infer<typeof Response>
        }
        export namespace List {
            export const Request = z.object({
                workflowId: Workflow.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publications: Publication.Schema.array(),
            })
            export type Response = z.infer<typeof Response>
        }
        export namespace Get {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publication: Publication.Schema,
            })
            export type Response = z.infer<typeof Response>
        }
        export namespace Activate {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publication: Publication.Schema,
            })
            export type Response = z.infer<typeof Response> 
        }

        export namespace Deactivate {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publication: Publication.Schema,
            })
            export type Response = z.infer<typeof Response>
        }

        export namespace Remove {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                success: z.boolean(),
            })
            export type Response = z.infer<typeof Response>
        }
    }
}