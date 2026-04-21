import z from "zod";
import { Expression } from "../Expression";
import type { Workflow } from "../Workflow";
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
    
    /**
     * Resolve `${{ @thisNodeValues[...] }}` templates on a Webhook definition
     * against the node's static values. Output is fully-concrete strings
     * suitable for indexing in the webhook registry.
     */
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
}
export type Webhook = z.infer<typeof Webhook.Schema>