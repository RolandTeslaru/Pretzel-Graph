"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaTradingService = void 0;
const domain_1 = require("../domain");
const common_1 = require("../domain/common");
class AlpacaTradingService {
    client;
    environment;
    constructor(client) {
        this.client = client;
        this.environment = client.paper ? "paper" : "live";
    }
    assertMutation(confirmLive) {
        if (this.environment === "live" && confirmLive !== true)
            throw new Error("Alpaca Trading: live trading requires confirmLive=true for every mutation.");
    }
    amount(args) {
        if (args.quantity !== undefined && args.notional !== undefined)
            throw new Error("Alpaca Trading: provide quantity or notional, not both.");
        if (args.quantity !== undefined && args.quantity > 0)
            return { qty: args.quantity };
        if (args.notional !== undefined && args.notional > 0)
            return { notional: args.notional };
        throw new Error("Alpaca Trading: a positive quantity or notional is required.");
    }
    submit = async (args) => {
        this.assertMutation(args.confirmLive);
        const symbol = (0, common_1.required)(args.symbol, "symbol").toUpperCase();
        const common = {
            timeInForce: args.timeInForce ?? "day",
            extendedHours: args.extendedHours ?? false,
            clientOrderId: args.clientOrderId?.trim() || undefined,
        };
        let order;
        switch (args.type) {
            case "market":
                order = await this.client.trading.orders.market({
                    ...common,
                    ...this.amount(args),
                    symbol,
                    side: args.side,
                });
                break;
            case "limit":
                if (args.quantity === undefined || args.quantity <= 0 || args.limitPrice === undefined)
                    throw new Error("Alpaca Trading: limit orders require positive quantity and limitPrice.");
                order = await this.client.trading.orders.limit({
                    ...common,
                    symbol,
                    side: args.side,
                    qty: args.quantity,
                    limitPrice: args.limitPrice,
                });
                break;
            case "stop":
                if (args.quantity === undefined || args.quantity <= 0 || args.stopPrice === undefined)
                    throw new Error("Alpaca Trading: stop orders require positive quantity and stopPrice.");
                order = await this.client.trading.orders.stop({
                    ...common,
                    symbol,
                    side: args.side,
                    qty: args.quantity,
                    stopPrice: args.stopPrice,
                });
                break;
            case "stop_limit":
                if (args.quantity === undefined || args.quantity <= 0
                    || args.stopPrice === undefined || args.limitPrice === undefined)
                    throw new Error("Alpaca Trading: stop-limit orders require positive quantity, stopPrice and limitPrice.");
                order = await this.client.trading.orders.stopLimit({
                    ...common,
                    symbol,
                    side: args.side,
                    qty: args.quantity,
                    stopPrice: args.stopPrice,
                    limitPrice: args.limitPrice,
                });
                break;
            case "trailing_stop":
                if (args.quantity === undefined || args.quantity <= 0)
                    throw new Error("Alpaca Trading: trailing-stop orders require a positive quantity.");
                if ((args.trailPrice === undefined) === (args.trailPercent === undefined))
                    throw new Error("Alpaca Trading: provide exactly one of trailPrice or trailPercent.");
                order = args.trailPrice !== undefined
                    ? await this.client.trading.orders.trailingStop({
                        ...common,
                        symbol,
                        side: args.side,
                        qty: args.quantity,
                        trailPrice: args.trailPrice,
                    })
                    : await this.client.trading.orders.trailingStop({
                        ...common,
                        symbol,
                        side: args.side,
                        qty: args.quantity,
                        trailPercent: args.trailPercent,
                    });
                break;
        }
        return domain_1.Alpaca.Trading.Order.fromAPI(order);
    };
    replace = async (args) => {
        this.assertMutation(args.confirmLive);
        const order = await this.client.trading.orders.patchOrderByOrderId({
            orderId: (0, common_1.required)(args.orderId, "orderId"),
            patchOrderRequest: {
                qty: args.quantity === undefined ? undefined : String(args.quantity),
                limitPrice: args.limitPrice === undefined ? undefined : String(args.limitPrice),
                stopPrice: args.stopPrice === undefined ? undefined : String(args.stopPrice),
                trail: args.trail === undefined ? undefined : String(args.trail),
                timeInForce: args.timeInForce,
                clientOrderId: args.clientOrderId?.trim() || undefined,
            },
        });
        return domain_1.Alpaca.Trading.Order.fromAPI(order);
    };
    cancel = async (orderId, confirmLive) => {
        this.assertMutation(confirmLive);
        const target = (0, common_1.required)(orderId, "orderId");
        await this.client.trading.orders.deleteOrderByOrderID({ orderId: target });
        return {
            action: "cancelOrder",
            environment: this.environment,
            succeeded: true,
            target,
            order: null,
            results: [],
        };
    };
    cancelAll = async (confirmLive) => {
        this.assertMutation(confirmLive);
        const response = await this.client.trading.orders.deleteAllOrders();
        const results = response.map((result) => ({
            target: result.id ?? null,
            status: result.status ?? null,
            succeeded: result.status !== undefined && result.status >= 200 && result.status < 300,
            order: null,
        }));
        return {
            action: "cancelAllOrders",
            environment: this.environment,
            succeeded: results.every((result) => result.succeeded),
            target: null,
            order: null,
            results,
        };
    };
    closePosition = async (args) => {
        this.assertMutation(args.confirmLive);
        if (args.quantity !== undefined && args.percentage !== undefined)
            throw new Error("Alpaca Trading: provide quantity or percentage, not both.");
        return domain_1.Alpaca.Trading.Order.fromAPI(await this.client.trading.positions.deleteOpenPosition({
            symbolOrAssetId: (0, common_1.required)(args.symbolOrId, "symbolOrId"),
            qty: args.quantity,
            percentage: args.percentage,
        }));
    };
    closeAllPositions = async (args) => {
        this.assertMutation(args.confirmLive);
        const response = await this.client.trading.positions.deleteAllOpenPositions({
            cancelOrders: args.cancelOrders ?? false,
        });
        const results = response.map((result) => ({
            target: result.symbol,
            status: result.status,
            succeeded: result.status >= 200 && result.status < 300,
            order: result.body ? domain_1.Alpaca.Trading.Order.fromAPI(result.body) : null,
        }));
        return {
            action: "closeAllPositions",
            environment: this.environment,
            succeeded: results.every((result) => result.succeeded),
            target: null,
            order: null,
            results,
        };
    };
    exerciseOption = async (symbolOrId, confirmLive) => {
        this.assertMutation(confirmLive);
        const target = (0, common_1.required)(symbolOrId, "symbolOrId");
        await this.client.trading.positions.optionExercise({ symbolOrContractId: target });
        return {
            action: "exerciseOption",
            environment: this.environment,
            succeeded: true,
            target,
            order: null,
            results: [],
        };
    };
}
exports.AlpacaTradingService = AlpacaTradingService;
