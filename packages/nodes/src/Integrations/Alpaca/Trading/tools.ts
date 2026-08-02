import { tool } from "@langchain/core/tools"
import { ToolBudget } from "@pretzel-graph/node-sdk"
import { z } from "zod/v3"

import type { AlpacaTradingService } from "../services"


const confirmLive = z.boolean().default(false)
    .describe("Must be true for a live credential. Ignored for paper trading.")

const timeInForce = z.enum(["day", "gtc", "opg", "cls", "ioc", "fok"])
    .default("day")


export function buildTools(trading: AlpacaTradingService) {

    const submitOrder = tool(
        async args => ToolBudget.value(await trading.submit(args)),
        {
            name:        "alpaca_trading_submit_order",
            description: "Submit a paper or live Alpaca market, limit, stop, stop-limit or trailing-stop order. Live credentials require confirmLive=true.",
            schema: z.object({
                type:           z.enum(["market", "limit", "stop", "stop_limit", "trailing_stop"]),
                symbol:         z.string().describe("Exact tradable symbol."),
                side:           z.enum(["buy", "sell"]),
                quantity:       z.number().positive().optional(),
                notional:       z.number().positive().optional().describe("Market orders only; mutually exclusive with quantity."),
                limitPrice:     z.number().positive().optional(),
                stopPrice:      z.number().positive().optional(),
                trailPrice:     z.number().positive().optional(),
                trailPercent:   z.number().positive().optional(),
                timeInForce,
                extendedHours:  z.boolean().default(false),
                clientOrderId:  z.string().max(128).optional(),
                confirmLive,
            }),
        },
    )


    const replaceOrder = tool(
        async args => ToolBudget.value(await trading.replace(args)),
        {
            name:        "alpaca_trading_replace_order",
            description: "Replace an open Alpaca order's quantity, price, trail or time-in-force. Live credentials require confirmLive=true.",
            schema: z.object({
                orderId:       z.string(),
                quantity:      z.number().positive().optional(),
                limitPrice:    z.number().positive().optional(),
                stopPrice:     z.number().positive().optional(),
                trail:         z.number().positive().optional(),
                timeInForce:   timeInForce.optional(),
                clientOrderId: z.string().max(128).optional(),
                confirmLive,
            }),
        },
    )


    const cancelOrder = tool(
        async ({ orderId, confirmLive }) =>
            ToolBudget.value(await trading.cancel(orderId, confirmLive)),
        {
            name:        "alpaca_trading_cancel_order",
            description: "Cancel one open Alpaca order by id. Live credentials require confirmLive=true.",
            schema: z.object({
                orderId: z.string(),
                confirmLive,
            }),
        },
    )


    const cancelAllOrders = tool(
        async ({ confirmLive }) =>
            ToolBudget.value(await trading.cancelAll(confirmLive)),
        {
            name:        "alpaca_trading_cancel_all_orders",
            description: "Cancel all open Alpaca orders. Live credentials require confirmLive=true.",
            schema: z.object({ confirmLive }),
        },
    )


    const closePosition = tool(
        async ({ symbolOrId, quantity, percentage, confirmLive }) =>
            ToolBudget.value(await trading.closePosition({
                symbolOrId,
                quantity,
                percentage,
                confirmLive,
            })),
        {
            name:        "alpaca_trading_close_position",
            description: "Close all or part of one open position. Quantity and percentage are mutually exclusive. Live credentials require confirmLive=true.",
            schema: z.object({
                symbolOrId: z.string(),
                quantity:   z.number().positive().optional(),
                percentage: z.number().positive().max(100).optional(),
                confirmLive,
            }),
        },
    )


    const closeAllPositions = tool(
        async ({ cancelOrders, confirmLive }) =>
            ToolBudget.value(await trading.closeAllPositions({ cancelOrders, confirmLive })),
        {
            name:        "alpaca_trading_close_all_positions",
            description: "Liquidate every open position, optionally canceling open orders first. Live credentials require confirmLive=true.",
            schema: z.object({
                cancelOrders: z.boolean().default(false),
                confirmLive,
            }),
        },
    )


    const exerciseOption = tool(
        async ({ symbolOrId, confirmLive }) =>
            ToolBudget.value(await trading.exerciseOption(symbolOrId, confirmLive)),
        {
            name:        "alpaca_trading_exercise_option",
            description: "Exercise an entire held option position. Live credentials require confirmLive=true.",
            schema: z.object({
                symbolOrId: z.string().describe("Exact option contract symbol or id."),
                confirmLive,
            }),
        },
    )


    return [
        submitOrder,
        replaceOrder,
        cancelOrder,
        cancelAllOrders,
        closePosition,
        closeAllPositions,
        exerciseOption,
    ]
}
