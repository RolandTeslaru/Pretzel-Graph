import z from "zod";
import type { AxiosInstance } from "axios";
import { NodeId } from "./Workflow/ids";
// Leaf modules only — the Execution barrel reaches Workflow, which imports this file.
import { Signal as ExecutionSignal } from "./Execution/signal";
import * as ExecutionEvent from "./Execution/event-base";
import { Consultation as ConsultationModule } from "./Consultation";

export namespace Webhook {
    export const Id = z.string().brand("WebhookId")
    export type Id = z.infer<typeof Id>

    export const WorkflowId = z.uuid().brand("WorkflowId")
    export type WorkflowId = z.infer<typeof WorkflowId>


    export const Path = z.string().brand("WebhookPath")
    export type Path = z.infer<typeof Path>

    export const RouteId = z.string().brand("WebhookRouteId")
    export type RouteId = z.infer<typeof RouteId>

    export const createId = (workflowId: WorkflowId, path: Path): RouteId =>
        `${workflowId}/${path}` as RouteId

    /**
     * Backend → webhook-server shared secret. The webhook server is internet-facing,
     * so its control routes need a caller check; the backend is a trusted holder, so
     * a shared secret is the right weight (unlike Execution.Token, which travels to
     * the worker and is therefore signed).
     *
     * Node lowercases inbound header names — set and read with this exact value.
     */
    export const BACKEND_TOKEN_HEADER = "backend-service-token"

    export const Method = z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"])
    export type Method = z.infer<typeof Method>

    export const ResponseMode = z.enum(["onReceived", "workflowCompletion", "manual"])
    export type ResponseMode = z.infer<typeof ResponseMode>



    export const Schema = z.object({
        id: Webhook.Id,
        method: z.string(),
        path: z.string(),
        responseMode: z.string(),
    })



    export const ResolvedSchema = z.object({
        id: Webhook.Id,
        method: Method,
        path: Path,
        responseMode: ResponseMode,
    })
    export type Resolved = z.infer<typeof ResolvedSchema>



    export namespace Payload {
        export const Schema = z.object({
            method: Method,
            path: Path,
            headers: z.record(z.string(), z.unknown()),
            query: z.record(z.string(), z.unknown()),
            body: z.unknown(),
        })
    }
    export type Payload = z.infer<typeof Payload.Schema>

    // ─────────────────────────────────────────────────────────
    // Test — in-editor webhook testing without publishing
    // ─────────────────────────────────────────────────────────
    export namespace Test {

        export namespace Event {

            const Base = ExecutionEvent.Base.extend({
                ignitedNodeId: NodeId
            })

            export const ReadyToReceive = Base.extend({
                type: z.literal("webhook-test:ready-to-receive"),
                createdAt: z.number(),
                timeout: z.number()
            })

            export const Schema = z.discriminatedUnion("type", [ReadyToReceive])

            export const create = ExecutionEvent.defineEventFactory(Schema)
        }
        export type Event = z.infer<typeof Event.Schema>



        export namespace Signal {

            export const Base = ExecutionSignal.Base.extend({
                ignitedNodeId: NodeId
            })

            export const ResolvePayload = Base.extend({
                type: z.literal("resolve_payload"),
                payload: Payload.Schema
            })

            export const Schema = z.discriminatedUnion("type", [ResolvePayload])
        }
        export type Signal = z.infer<typeof Signal.Schema>


        export namespace Consultation {

            // Namespaced: ConsultationModule.Variant is an open registry shared with every
            // other consulting node, so a bare tag would be free to collide. Pinned as a
            // literal on both schemas so parse rejects a mismatched variant.
            export const Variant = ConsultationModule.variant("webhook:payload")

            export const Request = ConsultationModule.Request.extend({
                variant: z.literal(Variant),
                path:    Webhook.Path,
                method:  Webhook.Method,
            })
            export type Request = z.infer<typeof Request>

            // path/method aren't echoed back — they're already on the request, and the
            // consultation id is what correlates the two.
            export const Resolution = ConsultationModule.Resolution.extend({
                variant: z.literal(Variant),
                payload: Webhook.Payload.Schema,
            })
            export type Resolution = z.infer<typeof Resolution>
        }



        export namespace API {
            export namespace Register {
                export const Request = z.object({
                    workflowId: WorkflowId,
                    path: Path,
                    method: Method,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({ ok: z.literal(true) })
                export type Response = z.infer<typeof Response>
            }

            export async function register(
                api: AxiosInstance,
                req: Register.Request,
            ): Promise<Register.Response> {
                const { data } = await api.post<Register.Response>('/api/webhook/test/register', req);
                return data;
            }
        }
    }
}
export type Webhook = z.infer<typeof Webhook.Schema>
