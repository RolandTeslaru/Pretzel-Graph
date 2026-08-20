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
        const account = this.account;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(account),
            };
        switch (fields.resource) {
            case "summary":
                return {
                    account: await account.summary(),
                };
            case "configuration":
                return {
                    configuration: await account.configuration(),
                };
            case "positions":
                if (fields.positionsAction === "list")
                    return {
                        positions: await account.positions.list(),
                    };
                return {
                    position: await account.positions.get(fields.positionSymbolOrId),
                };
            case "orders":
                if (fields.ordersAction === "list")
                    return {
                        orders: await account.orders.list({
                            status: fields.ordersStatus,
                            symbols: fields.ordersSymbols,
                            side: fields.ordersSide === "all" ? undefined : fields.ordersSide,
                            direction: fields.ordersDirection,
                            after: fields.ordersAfter,
                            until: fields.ordersUntil,
                            limit: fields.ordersLimit,
                        }),
                    };
                return {
                    order: await account.orders.get(fields.orderId),
                };
            case "activities":
                return {
                    activities: await account.activities({
                        activityTypes: fields.activityTypes,
                        category: fields.activityCategory === "all" ? undefined : fields.activityCategory,
                        direction: fields.activityDirection,
                        after: fields.activityAfter,
                        until: fields.activityUntil,
                        limit: fields.activityLimit,
                    }),
                };
            case "portfolio":
                return {
                    portfolio: await account.portfolio({
                        period: fields.portfolioPeriod,
                        timeframe: fields.portfolioTimeframe,
                        start: fields.portfolioStart,
                        end: fields.portfolioEnd,
                        extendedHours: fields.portfolioExtendedHours,
                    }),
                };
            case "watchlists":
                if (fields.watchlistsAction === "list")
                    return {
                        watchlists: await account.watchlists.list(),
                    };
                return {
                    watchlist: await account.watchlists.get({
                        id: fields.watchlistId,
                        name: fields.watchlistName,
                    }),
                };
        }
    }
    #account;
    get account() {
        if (this.#account)
            return this.#account;
        const instance = this.credentials.alpacaApi;
        if (!instance)
            throw new Error("Alpaca Account: attach an Alpaca credential.");
        const values = this.context.credentialsAPI.getDecryptedValue(instance.blob);
        const client = (0, client_1.createAlpacaClient)(this.httpClientFactory, (0, client_1.parseAlpacaCredentials)(values));
        return (this.#account = new services_1.AlpacaAccountService(client));
    }
    constructor(nodeId, context) {
        super(nodeId, context);
    }
}
exports.Node = Node;
