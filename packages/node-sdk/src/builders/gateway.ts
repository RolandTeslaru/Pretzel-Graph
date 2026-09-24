import type { Chat, Execution, Gateway } from "@pretzel-graph/shared/domain";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { z, ZodType } from "zod";
import type { InferFieldValues } from "../types";

// Declares that a node listens to the connection its `refFieldId` field points at.
export function defineGatewayListener(config: { refFieldId: string }): Gateway.Listener {
    return { refFieldId: config.refFieldId as Field.Id };
}

// The socket context, with this blueprint's field values in place of the untyped record.
export type GatewayContext<T_Blueprint extends Blueprint> =
    Omit<Gateway.Socket.Context, 'fieldValues'> & { readonly fieldValues: InferFieldValues<T_Blueprint> };

/**
 * Everything a node does with the events of the connection it listens to.
 *
 * `Gateway.Socket.Hooks` with this blueprint's field values in place of the untyped record, and
 * the event typed by the schema the three share.
 */
export type GatewayHooks<T_Blueprint extends Blueprint, T_Schema extends ZodType> = {
    readonly schema: T_Schema

    readonly scope?: (
        event:   z.infer<T_Schema>,
        context: GatewayContext<T_Blueprint>,
    ) => Gateway.Socket.ScopeFingerprint | null

    readonly filter: (
        event:   z.infer<T_Schema>,
        scope:   Gateway.Socket.ScopeFingerprint,
        context: GatewayContext<T_Blueprint>,
    ) => boolean

    readonly recorder?: (
        event:   z.infer<T_Schema>,
        scope:   Gateway.Socket.ScopeFingerprint,
        context: GatewayContext<T_Blueprint>,
    ) => Promise<void>

    readonly igniter?: (
        event:   z.infer<T_Schema>,
        scope:   Gateway.Socket.ScopeFingerprint,
        context: GatewayContext<T_Blueprint>,
    ) => Promise<Pick<Execution.Igniter, 'record' | 'debug' | 'chat_id' | 'inputs'>>
};

/**
 * Curried because a static member cannot reference its own class's type parameter.
 *
 * @example
 * static gatewayHooks = defineGatewayHooks<typeof Blueprint>()(Discord.Event.Schema, { scope, filter, recorder, igniter });
 */
export function defineGatewayHooks<T_Blueprint extends Blueprint>() {
    return <T_Schema extends ZodType>(
        schema: T_Schema,
        hooks: Omit<GatewayHooks<T_Blueprint, T_Schema>, 'schema'>,
    ): GatewayHooks<T_Blueprint, T_Schema> => ({ schema, ...hooks });
}
