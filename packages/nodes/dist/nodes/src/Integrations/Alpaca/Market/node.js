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
        const market = this.market;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(market),
            };
        switch (fields.resource) {
            case "assets":
                if (fields.assetsAction === "list")
                    return {
                        assets: await market.assets.list({
                            query: fields.assetsQuery,
                            status: fields.assetsStatus,
                            assetClass: fields.assetsClass === "all" ? undefined : fields.assetsClass,
                            exchange: fields.assetsExchange,
                            limit: fields.assetsLimit,
                        }),
                    };
                return {
                    asset: await market.assets.get(fields.assetSymbolOrId),
                };
            case "clock":
                return {
                    clock: await market.clock(),
                };
            case "calendar":
                return {
                    calendar: await market.calendar({
                        start: fields.calendarRange.from,
                        end: fields.calendarRange.to,
                        limit: fields.calendarLimit,
                    }),
                };
            case "bars":
                return {
                    bars: await market.bars({
                        assetClass: fields.barsAssetClass,
                        symbol: fields.barsSymbol,
                        unit: fields.barsUnit,
                        multiplier: fields.barsMultiplier,
                        start: fields.barsStart,
                        end: fields.barsEnd,
                        limit: fields.barsLimit,
                        feed: fields.barsFeed,
                    }),
                };
            case "trades":
                return {
                    trades: await market.trades({
                        assetClass: fields.tradesAssetClass,
                        symbol: fields.tradesSymbol,
                        start: fields.tradesStart,
                        end: fields.tradesEnd,
                        limit: fields.tradesLimit,
                        feed: fields.tradesFeed,
                    }),
                };
            case "quotes":
                return {
                    quotes: await market.quotes({
                        assetClass: fields.quotesAssetClass,
                        symbol: fields.quotesSymbol,
                        start: fields.quotesStart,
                        end: fields.quotesEnd,
                        limit: fields.quotesLimit,
                        feed: fields.quotesFeed,
                    }),
                };
            case "snapshot":
                return {
                    snapshot: await market.snapshot({
                        assetClass: fields.snapshotAssetClass,
                        symbol: fields.snapshotSymbol,
                        feed: fields.snapshotFeed,
                    }),
                };
            case "news":
                return {
                    news: await market.news({
                        symbols: fields.newsSymbols,
                        start: fields.newsStart,
                        end: fields.newsEnd,
                        limit: fields.newsLimit,
                    }),
                };
            case "options":
                if (fields.optionsAction === "listContracts")
                    return {
                        contracts: await market.optionContracts.list({
                            underlyingSymbols: fields.contractsUnderlyings,
                            status: fields.contractsStatus,
                            type: fields.contractsType === "all" ? undefined : fields.contractsType,
                            expirationDate: fields.contractsExpiration,
                            limit: fields.contractsLimit,
                        }),
                    };
                if (fields.optionsAction === "getContract")
                    return {
                        contract: await market.optionContracts.get(fields.contractSymbolOrId),
                    };
                return {
                    chain: await market.optionChain({
                        underlyingSymbol: fields.chainUnderlying,
                        type: fields.chainType === "all" ? undefined : fields.chainType,
                        expirationDate: fields.chainExpiration,
                        strikeFrom: fields.chainStrikeFrom,
                        strikeTo: fields.chainStrikeTo,
                        limit: fields.chainLimit,
                    }),
                };
            case "screener":
                if (fields.screenerView === "mostActive")
                    return {
                        active: await market.mostActives({
                            by: fields.activeBy,
                            limit: fields.activeLimit,
                        }),
                    };
                return {
                    movers: await market.movers({
                        marketType: fields.moversMarket,
                        limit: fields.moversLimit,
                    }),
                };
        }
    }
    #market;
    get market() {
        if (this.#market)
            return this.#market;
        const instance = this.credentials.alpacaApi;
        if (!instance)
            throw new Error("Alpaca Market: attach an Alpaca credential.");
        const values = this.context.credentialsAPI.getDecryptedValue(instance.blob);
        const client = (0, client_1.createAlpacaClient)(this.httpClientFactory, (0, client_1.parseAlpacaCredentials)(values));
        return (this.#market = new services_1.AlpacaMarketService(client));
    }
    constructor(nodeId, context) {
        super(nodeId, context);
    }
}
exports.Node = Node;
