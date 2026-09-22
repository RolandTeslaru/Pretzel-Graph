import type { Gateway } from "@pretzel-graph/shared/domain";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { z, ZodType } from "zod";
import type { InferFieldValues } from "../types";

export type LiteralGatewayListener<TId extends string> = Gateway.Listener & {
    id: TId & Gateway.Listener.Id;
    readonly __literalId?: TId;
};

// Declares that a node listens to the connection its `refFieldId` field points at. `filter` names
// a member of the class's static `gatewayFilters`, and defaults to the listener's own id.
export function defineGatewayListener<const TId extends string>(config: {
    id: TId;
    refFieldId: string;
    filter?: string;
}): LiteralGatewayListener<TId> {
    return {
        id:         config.id as TId & Gateway.Listener.Id,
        refFieldId: config.refFieldId as Field.Id,
        filter:     config.filter ?? config.id,
    };
}

// Decides whether one event is worth starting a run for; it runs per event, ahead of any execution.
export type GatewayFilter<T_Blueprint extends Blueprint, T_Event> = (
    event: T_Event,
    context: { fieldValues: InferFieldValues<T_Blueprint> },
) => boolean;

// A node's filters, with the schema every event is parsed against before one is called.
export type GatewayFilters<T_Blueprint extends Blueprint, T_Schema extends ZodType> = {
    readonly schema:  T_Schema
    readonly filters: Record<string, GatewayFilter<T_Blueprint, z.infer<T_Schema>>>
};

/**
 * The schema both types each filter's event and validates it, so an event it rejects never
 * reaches a filter. Curried because static members cannot reference a class type parameter.
 *
 * @example
 * static gatewayFilters = defineGatewayFilters<typeof Blueprint>()(Discord.Event.Schema, {
 *     message: (event, { fieldValues }) => !event.authorIsBot,
 * });
 */
export function defineGatewayFilters<T_Blueprint extends Blueprint>() {
    return <
        T_Schema extends ZodType,
        T extends Record<string, GatewayFilter<T_Blueprint, z.infer<T_Schema>>>,
    >(schema: T_Schema, filters: T) => ({ schema, filters });
}
