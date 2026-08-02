import type { trading } from "@alpacahq/alpaca-trade-api/rest"
import { z } from "zod"

import { iso } from "./common"


export namespace Order {
    export const Schema = z.object({
        id:             z.string().nullable(),
        clientOrderId:  z.string().nullable(),
        symbol:         z.string().nullable(),
        assetClass:     z.string().nullable(),
        side:           z.string().nullable(),
        type:           z.string(),
        orderClass:     z.string().nullable(),
        timeInForce:    z.string(),
        status:         z.string().nullable(),
        quantity:       z.string().nullable(),
        notional:       z.string().nullable(),
        filledQuantity: z.string().nullable(),
        filledPrice:    z.string().nullable(),
        limitPrice:     z.string().nullable(),
        stopPrice:      z.string().nullable(),
        trailPrice:     z.string().nullable(),
        trailPercent:   z.string().nullable(),
        extendedHours:  z.boolean(),
        submittedAt:    z.string().nullable(),
        filledAt:       z.string().nullable(),
        canceledAt:     z.string().nullable(),
        replacedBy:     z.string().nullable(),
        replaces:       z.string().nullable(),
    })

    export const fromAPI = (value: trading.Order): Order => ({
        id:             value.id ?? null,
        clientOrderId:  value.clientOrderId ?? null,
        symbol:         value.symbol ?? null,
        assetClass:     value.assetClass ?? null,
        side:           value.side ?? null,
        type:           value.type,
        orderClass:     value.orderClass ?? null,
        timeInForce:    value.timeInForce,
        status:         value.status ?? null,
        quantity:       value.qty ?? null,
        notional:       value.notional ?? null,
        filledQuantity: value.filledQty ?? null,
        filledPrice:    value.filledAvgPrice ?? null,
        limitPrice:     value.limitPrice ?? null,
        stopPrice:      value.stopPrice ?? null,
        trailPrice:     value.trailPrice ?? null,
        trailPercent:   value.trailPercent ?? null,
        extendedHours:  value.extendedHours ?? false,
        submittedAt:    iso(value.submittedAt),
        filledAt:       iso(value.filledAt),
        canceledAt:     iso(value.canceledAt),
        replacedBy:     value.replacedBy ?? null,
        replaces:       value.replaces ?? null,
    })
}

export type Order = z.infer<typeof Order.Schema>


export namespace Mutation {
    export const ResultSchema = z.object({
        target:    z.string().nullable(),
        status:    z.number().int().nullable(),
        succeeded: z.boolean(),
        order:     Order.Schema.nullable(),
    })

    export const Schema = z.object({
        action:      z.string(),
        environment: z.enum(["paper", "live"]),
        succeeded:   z.boolean(),
        target:      z.string().nullable(),
        order:       Order.Schema.nullable(),
        results:     z.array(ResultSchema),
    })
}

export type Mutation = z.infer<typeof Mutation.Schema>
