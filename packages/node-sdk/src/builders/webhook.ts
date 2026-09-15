import type { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import type { CredentialTemplate } from "./credential";

export type LiteralWebhook<
    TId extends string,
    TWebhook extends Webhook,
> = {
    id: TId & Webhook.Id;
    readonly __literalId?: TId;
} & Omit<TWebhook, "id">;

/**
 * Brands the webhook id from a plain string literal, like defineCredential does for
 * credentials. path/method stay `string` — they hold `${{ ... }}` expressions resolved
 * per node instance at registration, so neither is a concrete Webhook.Method here.
 */
export function defineWebhook<const TId extends string>(config: {
    id: TId;
    path: string;
    method: string;
    responseMode?: string;
    credential?: CredentialTemplate;
}): LiteralWebhook<TId, Webhook> {
    return {
        id: config.id as TId & Webhook.Id,
        path: config.path,
        method: config.method,
        // Only 'onReceived' is honoured today, so it's the default — blueprints needn't pin it.
        responseMode: config.responseMode ?? "onReceived",
        ...(config.credential ? { credential: config.credential } : {}),
    };
}
