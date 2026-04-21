import z from "zod";

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
        method: Method,
        path: Webhook.Path,
        responseMode: ResponseMode,
    })
}
export type Webhook = z.infer<typeof Webhook.Schema>