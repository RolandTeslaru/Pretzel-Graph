"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const sdk_1 = require("../sdk");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    async onRun() {
        const fields = this.fieldValues;
        const kalshi = this.kalshi;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(kalshi),
            };
        if (fields.action === "list") {
            switch (fields.listResource) {
                case "markets":
                    return {
                        markets: await kalshi.markets.list({
                            status: fields.listMarketsStatus,
                            eventTicker: fields.listMarketsEventTicker,
                            seriesTicker: fields.listMarketsSeriesTicker,
                            limit: fields.listMarketsMaxResults,
                        }),
                    };
                case "events":
                    return {
                        events: await kalshi.events.list({
                            status: fields.listEventsStatus,
                            seriesTicker: fields.listEventsSeriesTicker,
                            includeMarkets: fields.listEventsIncludeMarkets,
                            limit: fields.listEventsMaxResults,
                        }),
                    };
                case "series":
                    return {
                        series: await kalshi.series.list({
                            category: fields.listSeriesCategory,
                            tags: fields.listSeriesTags
                                ?.split(",")
                                .map(tag => tag.trim())
                                .filter(Boolean),
                            includeVolume: fields.listSeriesIncludeVolume,
                            limit: fields.listSeriesMaxResults,
                        }),
                    };
                case "trades":
                    return {
                        trades: await kalshi.trades.list({
                            ticker: fields.listTradesTicker,
                            includeHistorical: fields.listTradesIncludeHistorical,
                            blockTradesOnly: fields.listTradesBlockOnly,
                            limit: fields.listTradesMaxResults,
                        }),
                    };
            }
        }
        switch (fields.getResource) {
            case "market":
                return {
                    market: await kalshi.markets.get(fields.getMarketTicker),
                };
            case "event":
                return {
                    event: await kalshi.events.get(fields.getEventTicker),
                };
            case "series":
                return {
                    series: await kalshi.series.get(fields.getSeriesTicker),
                };
            case "orderBook":
                return {
                    orderBook: await kalshi.prices.orderBook({
                        ticker: fields.getOrderBookTicker,
                        depth: fields.getOrderBookDepth,
                    }),
                };
            case "priceHistory":
                return {
                    history: await kalshi.prices.history({
                        ticker: fields.getPriceHistoryTicker,
                        window: fields.getPriceHistoryWindow,
                        interval: Number(fields.getPriceHistoryInterval),
                        points: fields.getPriceHistoryPoints,
                    }),
                };
            case "exchangeStatus":
                return {
                    status: await kalshi.exchange.status(),
                };
        }
    }
    kalshi;
    constructor(nodeId, context) {
        super(nodeId, context);
        this.kalshi = new sdk_1.KalshiPublicSDK(this.httpClientFactory);
    }
}
exports.Node = Node;
