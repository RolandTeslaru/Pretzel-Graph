import z from "zod";
import type { AxiosInstance } from "axios";
import { Expression } from "../Expression";
import { Realtime } from "../Realtime";
import { Workflow } from "../Workflow";
import type { Field } from "./Field";

export namespace Webhook {
    export const Id = z.string().brand("WebhookId")
    export type Id = z.infer<typeof Id>

    export const Path = z.string().brand("WebhookPath")
    export type Path = z.infer<typeof Path>

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

    export function resolve(
        webhook: Webhook,
        node: Workflow.Node,
        staticValues: Record<Field.Id, unknown>,
    ): Resolved {
        const ctx: Expression.Context = {
            thisNode: node,
            thisNodeValues: staticValues,
            incoming: {},
        };
        return ResolvedSchema.parse({
            id: webhook.id,
            path: Expression.evaluate(webhook.path, ctx),
            method: Expression.evaluate(webhook.method, ctx),
            responseMode: Expression.evaluate(webhook.responseMode, ctx),
        });
    }

    // ─────────────────────────────────────────────────────────
    // Test — in-editor webhook testing without publishing
    // ─────────────────────────────────────────────────────────
    export namespace Test {

        export namespace Signal {
            export const Channel = Realtime.Channel.brand("WebhookTestChannel")
            export type Channel = z.infer<typeof Channel>

            export const getChannel = (workflowId: Workflow.Id): Channel =>
                `webhook:test:${workflowId}` as Channel

            const Base = Realtime.Signal.Base.extend({
                workflowId: Workflow.Id,
            })

            export namespace Resolve {
                export const Schema = Base.extend({
                    type: z.literal("resolve"),
                    payload: Payload.Schema,
                })
            }
            export type Resolve = z.infer<typeof Resolve.Schema>

            export const Schema = z.discriminatedUnion("type", [
                Resolve.Schema,
            ])
        }
        export type Signal = z.infer<typeof Signal.Schema>

        export namespace API {
            export namespace Register {
                export const Request = z.object({
                    workflowId: Workflow.Id,
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
