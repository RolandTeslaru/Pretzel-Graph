"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const client_1 = require("../client");
const domain_1 = require("../domain");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    async onRun() {
        const fields = this.fieldValues;
        const clob = this.clob;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(clob),
            };
        switch (fields.resource) {
            case "openOrders":
                return {
                    orders: await clob.orders.listOpen({
                        market: optional(fields.openOrdersConditionId),
                        asset_id: optional(fields.openOrdersTokenId),
                    }),
                };
            case "order":
                return {
                    order: await clob.orders.get({ order_id: fields.orderId }),
                };
            case "trades":
                return {
                    trades: await clob.trades.list({
                        market: optional(fields.tradesConditionId),
                        asset_id: optional(fields.tradesTokenId),
                        only_first_page: fields.tradesOnlyFirstPage,
                    }),
                };
            case "balance":
                return {
                    balance: await clob.balances.getAllowance({
                        asset_type: fields.balanceAssetType,
                        token_id: fields.balanceAssetType === "CONDITIONAL"
                            ? fields.balanceTokenId
                            : undefined,
                    }),
                };
            // areScoring covers one id as readily as many, so the output shape stays a map either
            // way rather than changing with the length of the list.
            case "scoring":
                return {
                    scoring: await clob.orders.areScoring({
                        order_ids: fields.scoringOrderIds,
                    }),
                };
            case "settings":
                return {
                    settings: await clob.account.getClosedOnlyMode(),
                };
        }
        switch (fields.rewardsView) {
            case "earnings":
                return {
                    earnings: await clob.rewards.listDailyEarnings({ date: fields.earningsDate }),
                };
            case "totals":
                return {
                    totals: await clob.rewards.listDailyTotals({ date: fields.totalsDate }),
                };
            case "markets":
                return {
                    markets: await clob.rewards.listUserMarkets({ date: fields.rewardMarketsDate }),
                };
        }
        return {
            percentages: await clob.rewards.getPercentages(),
        };
    }
    #client;
    // Built on first use, not in the constructor: every node in a workflow is instantiated at
    // compile time, and a missing credential should fail this node's run rather than the compile.
    get clob() {
        if (this.#client)
            return this.#client;
        const instance = this.credentials.polymarketApiKey;
        if (!instance)
            throw new Error("Polymarket Account: attach a Polymarket API Key credential.");
        const { signerAddress, apiKey, apiSecret, passphrase } = this.context.credentialsAPI.getDecryptedValue(instance.blob);
        this.#client = new client_1.PolymarketReadOnlyCLOBClient({
            signerAddress: domain_1.Polymarket.CLOB.Common.WalletAddress.parse(signerAddress),
            apiKey,
            apiSecret,
            passphrase,
        }, this.httpClientFactory);
        return this.#client;
    }
    constructor(nodeId, context) {
        super(nodeId, context);
    }
}
exports.Node = Node;
// Gamma and CLOB read an empty filter as "no filter", but only if it's absent — an empty string
// reaches the query as `market=` and matches nothing.
const optional = (value) => value?.trim() ? value.trim() : undefined;
