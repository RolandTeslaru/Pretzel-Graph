"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const client_1 = require("../client");
const services_1 = require("../services");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    async onRun() {
        const fields = this.fieldValues;
        const trading = this.trading;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(trading),
            };
        switch (fields.action) {
            case "submit": {
                const args = {
                    type: fields.orderType,
                    symbol: fields.submitSymbol,
                    side: fields.submitSide,
                    timeInForce: fields.submitTimeInForce,
                    extendedHours: fields.extendedHours,
                    clientOrderId: fields.clientOrderId,
                    confirmLive: fields.submitConfirmLive,
                };
                if (fields.orderType === "market") {
                    args.quantity = fields.marketQuantity;
                    args.notional = fields.marketNotional;
                }
                else if (fields.orderType === "limit") {
                    args.quantity = fields.limitQuantity;
                    args.limitPrice = fields.limitPrice;
                }
                else if (fields.orderType === "stop") {
                    args.quantity = fields.stopQuantity;
                    args.stopPrice = fields.stopPrice;
                }
                else if (fields.orderType === "stop_limit") {
                    args.quantity = fields.stopLimitQuantity;
                    args.stopPrice = fields.stopLimitStopPrice;
                    args.limitPrice = fields.stopLimitLimitPrice;
                }
                else {
                    args.quantity = fields.trailingQuantity;
                    if (fields.trailingMode === "price")
                        args.trailPrice = fields.trailingPrice;
                    else
                        args.trailPercent = fields.trailingPercent;
                }
                return {
                    order: await trading.submit(args),
                };
            }
            case "replace":
                return {
                    order: await trading.replace({
                        orderId: fields.replaceOrderId,
                        quantity: fields.replaceQuantity,
                        limitPrice: fields.replaceLimitPrice,
                        stopPrice: fields.replaceStopPrice,
                        trail: fields.replaceTrail,
                        timeInForce: fields.replaceTimeInForce,
                        clientOrderId: fields.replaceClientOrderId,
                        confirmLive: fields.replaceConfirmLive,
                    }),
                };
            case "cancel":
                return {
                    result: await trading.cancel(fields.cancelOrderId, fields.cancelConfirmLive),
                };
            case "cancelAll":
                return {
                    result: await trading.cancelAll(fields.cancelAllConfirmLive),
                };
            case "closePosition":
                return {
                    order: await trading.closePosition({
                        symbolOrId: fields.closeSymbolOrId,
                        quantity: fields.closeAmountType === "quantity"
                            ? fields.closeQuantity
                            : undefined,
                        percentage: fields.closeAmountType === "percentage"
                            ? fields.closePercentage
                            : undefined,
                        confirmLive: fields.closeConfirmLive,
                    }),
                };
            case "closeAll":
                return {
                    result: await trading.closeAllPositions({
                        cancelOrders: fields.closeAllCancelOrders,
                        confirmLive: fields.closeAllConfirmLive,
                    }),
                };
            case "exerciseOption":
                return {
                    result: await trading.exerciseOption(fields.exerciseSymbolOrId, fields.exerciseConfirmLive),
                };
        }
    }
    #trading;
    get trading() {
        if (this.#trading)
            return this.#trading;
        const instance = this.credentials.alpacaApi;
        if (!instance)
            throw new Error("Alpaca Trading: attach an Alpaca credential.");
        const values = this.context.credentialsAPI.getDecryptedValue(instance.blob);
        const client = (0, client_1.createAlpacaClient)(this.httpClientFactory, (0, client_1.parseAlpacaCredentials)(values));
        return (this.#trading = new services_1.AlpacaTradingService(client));
    }
    constructor(nodeId, context) {
        super(nodeId, context);
    }
}
exports.Node = Node;
