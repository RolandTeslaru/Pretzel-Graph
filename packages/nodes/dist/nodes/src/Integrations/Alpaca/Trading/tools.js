"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTools = buildTools;
const tools_1 = require("@langchain/core/tools");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const v3_1 = require("zod/v3");
const confirmLive = v3_1.z.boolean().default(false)
    .describe("Must be true for a live credential. Ignored for paper trading.");
const timeInForce = v3_1.z.enum(["day", "gtc", "opg", "cls", "ioc", "fok"])
    .default("day");
function buildTools(trading) {
    const submitOrder = (0, tools_1.tool)(async (args) => node_sdk_1.ToolBudget.value(await trading.submit(args)), {
        name: "alpaca_trading_submit_order",
        description: "Submit a paper or live Alpaca market, limit, stop, stop-limit or trailing-stop order. Live credentials require confirmLive=true.",
        schema: v3_1.z.object({
            type: v3_1.z.enum(["market", "limit", "stop", "stop_limit", "trailing_stop"]),
            symbol: v3_1.z.string().describe("Exact tradable symbol."),
            side: v3_1.z.enum(["buy", "sell"]),
            quantity: v3_1.z.number().positive().optional(),
            notional: v3_1.z.number().positive().optional().describe("Market orders only; mutually exclusive with quantity."),
            limitPrice: v3_1.z.number().positive().optional(),
            stopPrice: v3_1.z.number().positive().optional(),
            trailPrice: v3_1.z.number().positive().optional(),
            trailPercent: v3_1.z.number().positive().optional(),
            timeInForce,
            extendedHours: v3_1.z.boolean().default(false),
            clientOrderId: v3_1.z.string().max(128).optional(),
            confirmLive,
        }),
    });
    const replaceOrder = (0, tools_1.tool)(async (args) => node_sdk_1.ToolBudget.value(await trading.replace(args)), {
        name: "alpaca_trading_replace_order",
        description: "Replace an open Alpaca order's quantity, price, trail or time-in-force. Live credentials require confirmLive=true.",
        schema: v3_1.z.object({
            orderId: v3_1.z.string(),
            quantity: v3_1.z.number().positive().optional(),
            limitPrice: v3_1.z.number().positive().optional(),
            stopPrice: v3_1.z.number().positive().optional(),
            trail: v3_1.z.number().positive().optional(),
            timeInForce: timeInForce.optional(),
            clientOrderId: v3_1.z.string().max(128).optional(),
            confirmLive,
        }),
    });
    const cancelOrder = (0, tools_1.tool)(async ({ orderId, confirmLive }) => node_sdk_1.ToolBudget.value(await trading.cancel(orderId, confirmLive)), {
        name: "alpaca_trading_cancel_order",
        description: "Cancel one open Alpaca order by id. Live credentials require confirmLive=true.",
        schema: v3_1.z.object({
            orderId: v3_1.z.string(),
            confirmLive,
        }),
    });
    const cancelAllOrders = (0, tools_1.tool)(async ({ confirmLive }) => node_sdk_1.ToolBudget.value(await trading.cancelAll(confirmLive)), {
        name: "alpaca_trading_cancel_all_orders",
        description: "Cancel all open Alpaca orders. Live credentials require confirmLive=true.",
        schema: v3_1.z.object({ confirmLive }),
    });
    const closePosition = (0, tools_1.tool)(async ({ symbolOrId, quantity, percentage, confirmLive }) => node_sdk_1.ToolBudget.value(await trading.closePosition({
        symbolOrId,
        quantity,
        percentage,
        confirmLive,
    })), {
        name: "alpaca_trading_close_position",
        description: "Close all or part of one open position. Quantity and percentage are mutually exclusive. Live credentials require confirmLive=true.",
        schema: v3_1.z.object({
            symbolOrId: v3_1.z.string(),
            quantity: v3_1.z.number().positive().optional(),
            percentage: v3_1.z.number().positive().max(100).optional(),
            confirmLive,
        }),
    });
    const closeAllPositions = (0, tools_1.tool)(async ({ cancelOrders, confirmLive }) => node_sdk_1.ToolBudget.value(await trading.closeAllPositions({ cancelOrders, confirmLive })), {
        name: "alpaca_trading_close_all_positions",
        description: "Liquidate every open position, optionally canceling open orders first. Live credentials require confirmLive=true.",
        schema: v3_1.z.object({
            cancelOrders: v3_1.z.boolean().default(false),
            confirmLive,
        }),
    });
    const exerciseOption = (0, tools_1.tool)(async ({ symbolOrId, confirmLive }) => node_sdk_1.ToolBudget.value(await trading.exerciseOption(symbolOrId, confirmLive)), {
        name: "alpaca_trading_exercise_option",
        description: "Exercise an entire held option position. Live credentials require confirmLive=true.",
        schema: v3_1.z.object({
            symbolOrId: v3_1.z.string().describe("Exact option contract symbol or id."),
            confirmLive,
        }),
    });
    return [
        submitOrder,
        replaceOrder,
        cancelOrder,
        cancelAllOrders,
        closePosition,
        closeAllPositions,
        exerciseOption,
    ];
}
