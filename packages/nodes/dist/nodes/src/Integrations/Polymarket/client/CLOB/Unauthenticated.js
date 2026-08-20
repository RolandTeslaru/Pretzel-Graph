"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketUnauthenticatedCLOBClient = void 0;
const utils_1 = require("../../../../utils");
const domain_1 = require("../../domain");
const common_1 = require("./common");
/**
 * Public CLOB surface. Authenticated operations are intentionally absent.
 */
class PolymarketUnauthenticatedCLOBClient {
    #client;
    constructor(http) {
        this.#client = (0, common_1.createUnauthenticatedClobSDK)(http);
    }
    system = {
        status: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.System.Status.Request, domain_1.Polymarket.CLOB.API.System.Status.Response, () => this.#client.getOk()),
        version: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.System.Version.Request, domain_1.Polymarket.CLOB.API.System.Version.Response, () => this.#client.getVersion()),
        time: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.System.Time.Request, domain_1.Polymarket.CLOB.API.System.Time.Response, () => this.#client.getServerTime()),
    };
    markets = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Markets.List.Request, domain_1.Polymarket.CLOB.API.Markets.List.Response, ({ next_cursor }) => this.#client.getMarkets(next_cursor)),
        listSampling: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Markets.ListSampling.Request, domain_1.Polymarket.CLOB.API.Markets.ListSampling.Response, ({ next_cursor }) => this.#client.getSamplingMarkets(next_cursor)),
        listSimplified: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Markets.ListSimplified.Request, domain_1.Polymarket.CLOB.API.Markets.ListSimplified.Response, ({ next_cursor }) => this.#client.getSimplifiedMarkets(next_cursor)),
        listSamplingSimplified: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Markets.ListSamplingSimplified.Request, domain_1.Polymarket.CLOB.API.Markets.ListSamplingSimplified.Response, ({ next_cursor }) => this.#client.getSamplingSimplifiedMarkets(next_cursor)),
        get: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Markets.Get.Request, domain_1.Polymarket.CLOB.API.Markets.Get.Response, ({ condition_id }) => this.#client.getMarket(condition_id)),
        getClobInfo: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Markets.GetClobInfo.Request, domain_1.Polymarket.CLOB.API.Markets.GetClobInfo.Response, ({ condition_id }) => this.#client.getClobMarketInfo(condition_id)),
    };
    marketData = {
        getOrderBook: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetOrderBook.Request, domain_1.Polymarket.CLOB.API.MarketData.GetOrderBook.Response, ({ token_id }) => this.#client.getOrderBook(token_id)),
        getOrderBooks: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetOrderBooks.Request, domain_1.Polymarket.CLOB.API.MarketData.GetOrderBooks.Response, ({ params }) => this.#client.getOrderBooks(params)),
        getTickSize: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetTickSize.Request, domain_1.Polymarket.CLOB.API.MarketData.GetTickSize.Response, ({ token_id }) => this.#client.getTickSize(token_id)),
        getNegRisk: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetNegRisk.Request, domain_1.Polymarket.CLOB.API.MarketData.GetNegRisk.Response, ({ token_id }) => this.#client.getNegRisk(token_id)),
        getFeeRate: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetFeeRate.Request, domain_1.Polymarket.CLOB.API.MarketData.GetFeeRate.Response, ({ token_id }) => this.#client.getFeeRateBps(token_id)),
        getFeeExponent: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetFeeExponent.Request, domain_1.Polymarket.CLOB.API.MarketData.GetFeeExponent.Response, ({ token_id }) => this.#client.getFeeExponent(token_id)),
        getMidpoint: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetMidpoint.Request, domain_1.Polymarket.CLOB.API.MarketData.GetMidpoint.Response, ({ token_id }) => this.#client.getMidpoint(token_id)),
        getMidpoints: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetMidpoints.Request, domain_1.Polymarket.CLOB.API.MarketData.GetMidpoints.Response, ({ params }) => this.#client.getMidpoints(params)),
        getPrice: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetPrice.Request, domain_1.Polymarket.CLOB.API.MarketData.GetPrice.Response, ({ token_id, side }) => this.#client.getPrice(token_id, side)),
        getPrices: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetPrices.Request, domain_1.Polymarket.CLOB.API.MarketData.GetPrices.Response, ({ params }) => this.#client.getPrices(params)),
        getSpread: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetSpread.Request, domain_1.Polymarket.CLOB.API.MarketData.GetSpread.Response, ({ token_id }) => this.#client.getSpread(token_id)),
        getSpreads: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetSpreads.Request, domain_1.Polymarket.CLOB.API.MarketData.GetSpreads.Response, ({ params }) => this.#client.getSpreads(params)),
        getLastTradePrice: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetLastTradePrice.Request, domain_1.Polymarket.CLOB.API.MarketData.GetLastTradePrice.Response, ({ token_id }) => this.#client.getLastTradePrice(token_id)),
        getLastTradePrices: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetLastTradePrices.Request, domain_1.Polymarket.CLOB.API.MarketData.GetLastTradePrices.Response, ({ params }) => this.#client.getLastTradesPrices(params)),
        getPriceHistory: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.GetPriceHistory.Request, domain_1.Polymarket.CLOB.API.MarketData.GetPriceHistory.Response, (request) => this.#client.getPricesHistory(request)),
        hashOrderBook: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.HashOrderBook.Request, domain_1.Polymarket.CLOB.API.MarketData.HashOrderBook.Response, ({ order_book }) => this.#client.getOrderBookHash(order_book)),
        calculateMarketPrice: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.MarketData.CalculateMarketPrice.Request, domain_1.Polymarket.CLOB.API.MarketData.CalculateMarketPrice.Response, ({ token_id, side, amount, order_type }) => this.#client.calculateMarketPrice(token_id, side, amount, order_type)),
    };
    trades = {
        listMarketEvents: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Trades.ListMarketEvents.Request, domain_1.Polymarket.CLOB.API.Trades.ListMarketEvents.Response, ({ condition_id }) => this.#client.getMarketTradesEvents(condition_id)),
    };
    rewards = {
        listCurrent: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.ListCurrent.Request, domain_1.Polymarket.CLOB.API.Rewards.ListCurrent.Response, () => this.#client.getCurrentRewards()),
        getMarket: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.GetMarket.Request, domain_1.Polymarket.CLOB.API.Rewards.GetMarket.Response, ({ condition_id }) => this.#client.getRawRewardsForMarket(condition_id)),
    };
    builders = {
        listTrades: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Builders.ListTrades.Request, domain_1.Polymarket.CLOB.API.Builders.ListTrades.Response, ({ next_cursor, ...params }) => this.#client.getBuilderTrades(params, next_cursor)),
    };
}
exports.PolymarketUnauthenticatedCLOBClient = PolymarketUnauthenticatedCLOBClient;
