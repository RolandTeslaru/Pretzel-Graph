"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const sdk_1 = require("../sdk");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    async onRun() {
        const fields = this.fieldValues;
        const polymarket = this.polymarket;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(polymarket),
            };
        // The address is validated inside the SDK, once, rather than at each branch here.
        const wallet = fields.walletAddress;
        switch (fields.resource) {
            case "positions":
                return {
                    positions: await polymarket.wallets.positions({
                        wallet,
                        limit: fields.positionsMaxResults,
                        minSize: fields.positionsSizeThreshold,
                        redeemableOnly: fields.positionsRedeemableOnly,
                        sortBy: fields.positionsSortBy,
                        direction: fields.positionsSortDirection,
                    }),
                };
            case "closedPositions":
                return {
                    positions: await polymarket.wallets.closedPositions({
                        wallet,
                        limit: fields.closedMaxResults,
                        sortBy: fields.closedSortBy,
                        direction: fields.closedSortDirection,
                    }),
                };
            case "activity":
                return {
                    activity: await polymarket.wallets.activity({
                        wallet,
                        limit: fields.activityMaxResults,
                        type: fields.activityType,
                        direction: fields.activitySortDirection,
                    }),
                };
            case "value":
                return {
                    value: await polymarket.wallets.value(wallet),
                };
            case "tradedMarkets":
                return {
                    traded: await polymarket.wallets.tradedMarkets(wallet),
                };
            case "identity":
                return {
                    profile: await polymarket.wallets.identity(wallet),
                };
        }
        return {
            leaderboard: await polymarket.wallets.rank({
                wallet,
                period: fields.rankTimePeriod,
                rankedBy: fields.rankOrderBy,
            }),
        };
    }
    polymarket;
    constructor(nodeId, context) {
        super(nodeId, context);
        this.polymarket = new sdk_1.PolymarketPublicSDK(this.httpClientFactory);
    }
}
exports.Node = Node;
