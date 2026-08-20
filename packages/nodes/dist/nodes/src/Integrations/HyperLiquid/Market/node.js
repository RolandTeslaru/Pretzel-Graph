"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const client_1 = require("../client");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    #info;
    constructor(nodeId, context) {
        super(nodeId, context);
        this.#info = new client_1.HyperLiquidInfoClient(this.httpClientFactory);
    }
    async onRun() {
        const fields = this.fieldValues;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(this.#info),
            };
        switch (fields.resource) {
            case "markets": {
                const markets = fields.marketKind === "spot"
                    ? await this.#info.spotMarkets()
                    : await this.#info.perpetualMarkets({ dex: fields.marketsDex });
                return {
                    markets: markets.slice(0, fields.marketsLimit),
                };
            }
            case "mids": {
                const mids = await this.#info.mids({ dex: fields.midsDex });
                return {
                    mids: (0, tools_1.selectMids)(mids, fields.midsCoin, fields.midsLimit),
                };
            }
            case "candles": {
                const endTime = Date.now();
                return {
                    candles: await this.#info.candles({
                        coin: fields.candlesCoin,
                        interval: fields.candlesInterval,
                        startTime: endTime - fields.candlesLookbackHours * 60 * 60 * 1_000,
                        endTime,
                    }),
                };
            }
            case "orderBook":
                return {
                    orderBook: await this.#info.orderBook({
                        coin: fields.orderBookCoin,
                        depth: fields.orderBookDepth,
                    }),
                };
        }
    }
}
exports.Node = Node;
