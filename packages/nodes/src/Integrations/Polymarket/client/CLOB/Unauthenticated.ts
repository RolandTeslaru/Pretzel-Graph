import {
    OrderType,
    Side,
    type BookParams,
    type BuilderTradeParams,
    type ClobClient,
    type OrderBookSummary,
    type PriceHistoryFilterParams,
} from "@polymarket/clob-client-v2"
import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../../utils"
import { Polymarket } from "../../domain"
import { createUnauthenticatedClobSDK } from "./common"

/**
 * Public CLOB surface. Authenticated operations are intentionally absent.
 */
export class PolymarketUnauthenticatedCLOBClient {
    readonly #client: ClobClient

    constructor(http: HTTP.ClientAPI) {
        this.#client = createUnauthenticatedClobSDK(http)
    }

    public readonly system = {
        status: withAPIParsing(
            Polymarket.CLOB.API.System.Status.Request,
            Polymarket.CLOB.API.System.Status.Response,
            () => this.#client.getOk(),
        ),

        version: withAPIParsing(
            Polymarket.CLOB.API.System.Version.Request,
            Polymarket.CLOB.API.System.Version.Response,
            () => this.#client.getVersion(),
        ),

        time: withAPIParsing(
            Polymarket.CLOB.API.System.Time.Request,
            Polymarket.CLOB.API.System.Time.Response,
            () => this.#client.getServerTime(),
        ),
    }

    public readonly markets = {
        list: withAPIParsing(
            Polymarket.CLOB.API.Markets.List.Request,
            Polymarket.CLOB.API.Markets.List.Response,
            ({ next_cursor }) => this.#client.getMarkets(next_cursor),
        ),

        listSampling: withAPIParsing(
            Polymarket.CLOB.API.Markets.ListSampling.Request,
            Polymarket.CLOB.API.Markets.ListSampling.Response,
            ({ next_cursor }) =>
                this.#client.getSamplingMarkets(next_cursor),
        ),

        listSimplified: withAPIParsing(
            Polymarket.CLOB.API.Markets.ListSimplified.Request,
            Polymarket.CLOB.API.Markets.ListSimplified.Response,
            ({ next_cursor }) =>
                this.#client.getSimplifiedMarkets(next_cursor),
        ),

        listSamplingSimplified: withAPIParsing(
            Polymarket.CLOB.API.Markets.ListSamplingSimplified.Request,
            Polymarket.CLOB.API.Markets.ListSamplingSimplified.Response,
            ({ next_cursor }) =>
                this.#client.getSamplingSimplifiedMarkets(next_cursor),
        ),

        get: withAPIParsing(
            Polymarket.CLOB.API.Markets.Get.Request,
            Polymarket.CLOB.API.Markets.Get.Response,
            ({ condition_id }) => this.#client.getMarket(condition_id),
        ),

        getClobInfo: withAPIParsing(
            Polymarket.CLOB.API.Markets.GetClobInfo.Request,
            Polymarket.CLOB.API.Markets.GetClobInfo.Response,
            ({ condition_id }) =>
                this.#client.getClobMarketInfo(condition_id),
        ),
    }

    public readonly marketData = {
        getOrderBook: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetOrderBook.Request,
            Polymarket.CLOB.API.MarketData.GetOrderBook.Response,
            ({ token_id }) => this.#client.getOrderBook(token_id),
        ),

        getOrderBooks: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetOrderBooks.Request,
            Polymarket.CLOB.API.MarketData.GetOrderBooks.Response,
            ({ params }) => this.#client.getOrderBooks(params as BookParams[]),
        ),

        getTickSize: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetTickSize.Request,
            Polymarket.CLOB.API.MarketData.GetTickSize.Response,
            ({ token_id }) => this.#client.getTickSize(token_id),
        ),

        getNegRisk: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetNegRisk.Request,
            Polymarket.CLOB.API.MarketData.GetNegRisk.Response,
            ({ token_id }) => this.#client.getNegRisk(token_id),
        ),

        getFeeRate: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetFeeRate.Request,
            Polymarket.CLOB.API.MarketData.GetFeeRate.Response,
            ({ token_id }) => this.#client.getFeeRateBps(token_id),
        ),

        getFeeExponent: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetFeeExponent.Request,
            Polymarket.CLOB.API.MarketData.GetFeeExponent.Response,
            ({ token_id }) => this.#client.getFeeExponent(token_id),
        ),

        getMidpoint: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetMidpoint.Request,
            Polymarket.CLOB.API.MarketData.GetMidpoint.Response,
            ({ token_id }) => this.#client.getMidpoint(token_id),
        ),

        getMidpoints: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetMidpoints.Request,
            Polymarket.CLOB.API.MarketData.GetMidpoints.Response,
            ({ params }) => this.#client.getMidpoints(params as BookParams[]),
        ),

        getPrice: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetPrice.Request,
            Polymarket.CLOB.API.MarketData.GetPrice.Response,
            ({ token_id, side }) => this.#client.getPrice(token_id, side),
        ),

        getPrices: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetPrices.Request,
            Polymarket.CLOB.API.MarketData.GetPrices.Response,
            ({ params }) => this.#client.getPrices(params as BookParams[]),
        ),

        getSpread: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetSpread.Request,
            Polymarket.CLOB.API.MarketData.GetSpread.Response,
            ({ token_id }) => this.#client.getSpread(token_id),
        ),

        getSpreads: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetSpreads.Request,
            Polymarket.CLOB.API.MarketData.GetSpreads.Response,
            ({ params }) => this.#client.getSpreads(params as BookParams[]),
        ),

        getLastTradePrice: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetLastTradePrice.Request,
            Polymarket.CLOB.API.MarketData.GetLastTradePrice.Response,
            ({ token_id }) => this.#client.getLastTradePrice(token_id),
        ),

        getLastTradePrices: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetLastTradePrices.Request,
            Polymarket.CLOB.API.MarketData.GetLastTradePrices.Response,
            ({ params }) =>
                this.#client.getLastTradesPrices(params as BookParams[]),
        ),

        getPriceHistory: withAPIParsing(
            Polymarket.CLOB.API.MarketData.GetPriceHistory.Request,
            Polymarket.CLOB.API.MarketData.GetPriceHistory.Response,
            (request) =>
                this.#client.getPricesHistory(
                    request as PriceHistoryFilterParams,
                ),
        ),

        hashOrderBook: withAPIParsing(
            Polymarket.CLOB.API.MarketData.HashOrderBook.Request,
            Polymarket.CLOB.API.MarketData.HashOrderBook.Response,
            ({ order_book }) =>
                this.#client.getOrderBookHash(
                    order_book as unknown as OrderBookSummary,
                ),
        ),

        calculateMarketPrice: withAPIParsing(
            Polymarket.CLOB.API.MarketData.CalculateMarketPrice.Request,
            Polymarket.CLOB.API.MarketData.CalculateMarketPrice.Response,
            ({ token_id, side, amount, order_type }) =>
                this.#client.calculateMarketPrice(
                    token_id,
                    side as Side,
                    amount,
                    order_type as OrderType | undefined,
                ),
        ),
    }

    public readonly trades = {
        listMarketEvents: withAPIParsing(
            Polymarket.CLOB.API.Trades.ListMarketEvents.Request,
            Polymarket.CLOB.API.Trades.ListMarketEvents.Response,
            ({ condition_id }) =>
                this.#client.getMarketTradesEvents(condition_id),
        ),
    }

    public readonly rewards = {
        listCurrent: withAPIParsing(
            Polymarket.CLOB.API.Rewards.ListCurrent.Request,
            Polymarket.CLOB.API.Rewards.ListCurrent.Response,
            () => this.#client.getCurrentRewards(),
        ),

        getMarket: withAPIParsing(
            Polymarket.CLOB.API.Rewards.GetMarket.Request,
            Polymarket.CLOB.API.Rewards.GetMarket.Response,
            ({ condition_id }) =>
                this.#client.getRawRewardsForMarket(condition_id),
        ),
    }

    public readonly builders = {
        listTrades: withAPIParsing(
            Polymarket.CLOB.API.Builders.ListTrades.Request,
            Polymarket.CLOB.API.Builders.ListTrades.Response,
            ({ next_cursor, ...params }) =>
                this.#client.getBuilderTrades(
                    params as BuilderTradeParams,
                    next_cursor,
                ),
        ),
    }
}
