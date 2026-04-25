import type { Webhook } from "@pretzel-graph/shared/domain/Webhook";

export type LiteralWebhook<
    TId extends string,
    TWebhook extends Webhook,
> = {
    id: TId & Webhook.Id;
    readonly __literalId?: TId;
} & Omit<TWebhook, "id">;

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
