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

export namespace WebhookBuilder {
    export type BaseProps<
        TId extends string,
        TMethod extends Webhook.Method,
        TResponseMode extends Webhook.ResponseMode,
    > = {
        id: TId;
        method: TMethod;
        path: string;
        responseMode: TResponseMode;
    };

    type Ret<
        TId extends string,
        TMethod extends Webhook.Method,
        TResponseMode extends Webhook.ResponseMode,
    > = LiteralWebhook<
        TId,
        Webhook & { method: TMethod; responseMode: TResponseMode }
    >;

    function buildBase<
        TId extends string,
        TMethod extends Webhook.Method,
        TResponseMode extends Webhook.ResponseMode,
    >(config: BaseProps<TId, TMethod, TResponseMode>) {
        return {
            id: config.id as TId & Webhook.Id,
            method: config.method,
            path: config.path as Webhook.Path,
            responseMode: config.responseMode,
        } satisfies { id: TId & Webhook.Id } & Omit<Webhook, "id">;
    }

    export function Route<
        TId extends string,
        TMethod extends Webhook.Method,
        TResponseMode extends Webhook.ResponseMode,
    >(config: BaseProps<TId, TMethod, TResponseMode>): Ret<TId, TMethod, TResponseMode> {
        return buildBase(config) as unknown as Ret<TId, TMethod, TResponseMode>;
    }

    export function GET<
        TId extends string,
        TResponseMode extends Webhook.ResponseMode,
    >(
        config: Omit<BaseProps<TId, "GET", TResponseMode>, "method">
    ): Ret<TId, "GET", TResponseMode> {
        return buildBase({ ...config, method: "GET" }) as unknown as Ret<TId, "GET", TResponseMode>;
    }

    export function POST<
        TId extends string,
        TResponseMode extends Webhook.ResponseMode,
    >(
        config: Omit<BaseProps<TId, "POST", TResponseMode>, "method">
    ): Ret<TId, "POST", TResponseMode> {
        return buildBase({ ...config, method: "POST" }) as unknown as Ret<TId, "POST", TResponseMode>;
    }

    export function PUT<
        TId extends string,
        TResponseMode extends Webhook.ResponseMode,
    >(
        config: Omit<BaseProps<TId, "PUT", TResponseMode>, "method">
    ): Ret<TId, "PUT", TResponseMode> {
        return buildBase({ ...config, method: "PUT" }) as unknown as Ret<TId, "PUT", TResponseMode>;
    }

    export function PATCH<
        TId extends string,
        TResponseMode extends Webhook.ResponseMode,
    >(
        config: Omit<BaseProps<TId, "PATCH", TResponseMode>, "method">
    ): Ret<TId, "PATCH", TResponseMode> {
        return buildBase({ ...config, method: "PATCH" }) as unknown as Ret<TId, "PATCH", TResponseMode>;
    }

    export function DELETE<
        TId extends string,
        TResponseMode extends Webhook.ResponseMode,
    >(
        config: Omit<BaseProps<TId, "DELETE", TResponseMode>, "method">
    ): Ret<TId, "DELETE", TResponseMode> {
        return buildBase({ ...config, method: "DELETE" }) as unknown as Ret<TId, "DELETE", TResponseMode>;
    }
}
