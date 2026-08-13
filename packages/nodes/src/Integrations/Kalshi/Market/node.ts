import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain"

import { Kalshi } from "../domain"
import { KalshiPublicSDK } from "../sdk"
import { Blueprint } from "./blueprint"
import { buildTools } from "./tools"


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues
        const kalshi = this.kalshi

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(kalshi),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>

        if (fields.action === "list") {

            switch (fields.listResource) {

                case "markets":
                    return {
                        markets: await kalshi.markets.list({
                            status:       fields.listMarketsStatus,
                            eventTicker:  fields.listMarketsEventTicker,
                            seriesTicker: fields.listMarketsSeriesTicker,
                            limit:        fields.listMarketsMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                case "events":
                    return {
                        events: await kalshi.events.list({
                            status:         fields.listEventsStatus,
                            seriesTicker:   fields.listEventsSeriesTicker,
                            includeMarkets: fields.listEventsIncludeMarkets,
                            limit:          fields.listEventsMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                case "series":
                    return {
                        series: await kalshi.series.list({
                            category: fields.listSeriesCategory,
                            tags: fields.listSeriesTags
                                ?.split(",")
                                .map(tag => tag.trim())
                                .filter(Boolean),
                            includeVolume: fields.listSeriesIncludeVolume,
                            limit:         fields.listSeriesMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                case "trades":
                    return {
                        trades: await kalshi.trades.list({
                            ticker:            fields.listTradesTicker,
                            includeHistorical: fields.listTradesIncludeHistorical,
                            blockTradesOnly:   fields.listTradesBlockOnly,
                            limit:             fields.listTradesMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>
            }
        }

        switch (fields.getResource) {

            case "market":
                return {
                    market: await kalshi.markets.get(fields.getMarketTicker),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "event":
                return {
                    event: await kalshi.events.get(fields.getEventTicker),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "series":
                return {
                    series: await kalshi.series.get(fields.getSeriesTicker),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "orderBook":
                return {
                    orderBook: await kalshi.prices.orderBook({
                        ticker: fields.getOrderBookTicker,
                        depth:  fields.getOrderBookDepth,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "priceHistory":
                return {
                    history: await kalshi.prices.history({
                        ticker:   fields.getPriceHistoryTicker,
                        window:   fields.getPriceHistoryWindow,
                        interval: Number(fields.getPriceHistoryInterval) as Kalshi.PriceHistory.Interval,
                        points:   fields.getPriceHistoryPoints,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "exchangeStatus":
                return {
                    status: await kalshi.exchange.status(),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>
        }
    }


    private readonly kalshi: KalshiPublicSDK

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context)
        this.kalshi = new KalshiPublicSDK(this.httpClientFactory)
    }
}
