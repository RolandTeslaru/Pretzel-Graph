import type { Chat, Gateway } from "@pretzel-graph/shared/domain";
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

// Decides whether one event is worth starting a run for; it runs per event, ahead of any execution.
export type GatewayFilter<T_Blueprint extends Blueprint, T_Event> = (
    event:   T_Event,
    context: GatewayContext<T_Blueprint>,
) => boolean;

// A node's filter, with the schema every event is parsed against before it is called.
export type GatewayFilters<T_Blueprint extends Blueprint, T_Schema extends ZodType> = {
    readonly schema: T_Schema
    readonly filter: GatewayFilter<T_Blueprint, z.infer<T_Schema>>
};

/**
 * The schema both types each filter's event and validates it, so an event it rejects never
 * reaches a filter. Curried because static members cannot reference a class type parameter.
 *
 * @example
 * static gatewayFilter = defineGatewayFilter<typeof Blueprint>()(
 *     Discord.Event.Schema,
 *     (event, { fieldValues }) => !event.author.bot,
 * );
 */
export function defineGatewayFilter<T_Blueprint extends Blueprint>() {
    return <T_Schema extends ZodType>(
        schema: T_Schema,
        filter: GatewayFilter<T_Blueprint, z.infer<T_Schema>>,
    ) => ({ schema, filter });
}


/**
 * Records an event that passed the filter, whether or not it starts a run.
 *
 * Three messages in a burst are three recorder calls and one execution, so the two the agent did
 * not fire on are still in the chat when it reads its history. The chat id it returns becomes the
 * igniter's `chat_id`.
 */
export type GatewayRecorder<T_Blueprint extends Blueprint, T_Event> = (
    event:   T_Event,
    context: GatewayContext<T_Blueprint>,
) => Promise<Chat.Id | void>;

export type GatewayRecorders<T_Blueprint extends Blueprint, T_Schema extends ZodType> = {
    readonly schema:   T_Schema
    readonly recorder: GatewayRecorder<T_Blueprint, z.infer<T_Schema>>
};

/**
 * Curried for the same reason as `defineGatewayFilter`: a static member cannot reference the
 * class's own type parameter.
 *
 * @example
 * static gatewayRecorder = defineGatewayRecorder<typeof Blueprint>()(
 *     Discord.Event.Schema,
 *     async (event, { chatAPI }) => chatAPI.append(key, [message]),
 * );
 */
export function defineGatewayRecorder<T_Blueprint extends Blueprint>() {
    return <T_Schema extends ZodType>(
        schema:   T_Schema,
        recorder: GatewayRecorder<T_Blueprint, z.infer<T_Schema>>,
    ) => ({ schema, recorder });
}
