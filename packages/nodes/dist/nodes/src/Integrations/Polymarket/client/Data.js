"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketDataClient = exports.POLYMARKET_DATA_BASE_URL = void 0;
const utils_1 = require("../../../utils");
const domain_1 = require("../domain");
exports.POLYMARKET_DATA_BASE_URL = "https://data-api.polymarket.com";
class PolymarketDataClient {
    #client;
    constructor(http) {
        this.#client = http.create({
            vendor: "Polymarket",
            baseURL: exports.POLYMARKET_DATA_BASE_URL,
            headers: { "User-Agent": "PretzelGraph/1.0" },
            // Data API arrays are comma-separated: ?market=id1,id2.
            paramsSerializer: {
                serialize: (params) => {
                    const query = new URLSearchParams();
                    for (const [key, value] of Object.entries(params)) {
                        if (value === undefined)
                            continue;
                        query.set(key, Array.isArray(value)
                            ? value.join(",")
                            : String(value));
                    }
                    return query.toString();
                },
            },
        });
    }
    async get(path, params, responseType) {
        return this.#client.get(path, {
            params,
            responseType,
        });
    }
    status = {
        get: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Status.Get.Request, domain_1.Polymarket.Data.API.Status.Get.Response, () => this.get("/")),
    };
    positions = {
        listCurrent: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Positions.ListCurrent.Request, domain_1.Polymarket.Data.API.Positions.ListCurrent.Response, (request) => this.get("/positions", request)),
        listClosed: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Positions.ListClosed.Request, domain_1.Polymarket.Data.API.Positions.ListClosed.Response, (request) => this.get("/closed-positions", request)),
        listForMarket: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Positions.ListForMarket.Request, domain_1.Polymarket.Data.API.Positions.ListForMarket.Response, (request) => this.get("/v1/market-positions", request)),
        listCombos: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Positions.ListCombos.Request, domain_1.Polymarket.Data.API.Positions.ListCombos.Response, (request) => this.get("/v1/positions/combos", request)),
    };
    trades = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Trades.List.Request, domain_1.Polymarket.Data.API.Trades.List.Response, (request) => this.get("/trades", request)),
    };
    activity = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Activity.List.Request, domain_1.Polymarket.Data.API.Activity.List.Response, (request) => this.get("/activity", request)),
        listCombos: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Activity.ListCombos.Request, domain_1.Polymarket.Data.API.Activity.ListCombos.Response, (request) => this.get("/v1/activity/combos", request)),
    };
    users = {
        getValue: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Users.GetValue.Request, domain_1.Polymarket.Data.API.Users.GetValue.Response, (request) => this.get("/value", request)),
        getTradedMarketCount: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Users.GetTradedMarketCount.Request, domain_1.Polymarket.Data.API.Users.GetTradedMarketCount.Response, (request) => this.get("/traded", request)),
    };
    markets = {
        listHolders: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Markets.ListHolders.Request, domain_1.Polymarket.Data.API.Markets.ListHolders.Response, (request) => this.get("/holders", request)),
        getOpenInterest: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Markets.GetOpenInterest.Request, domain_1.Polymarket.Data.API.Markets.GetOpenInterest.Response, (request) => this.get("/oi", request)),
        getLiveVolume: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Markets.GetLiveVolume.Request, domain_1.Polymarket.Data.API.Markets.GetLiveVolume.Response, (request) => this.get("/live-volume", request)),
    };
    leaderboard = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Leaderboard.List.Request, domain_1.Polymarket.Data.API.Leaderboard.List.Response, (request) => this.get("/v1/leaderboard", request)),
    };
    builders = {
        listLeaderboard: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Builders.ListLeaderboard.Request, domain_1.Polymarket.Data.API.Builders.ListLeaderboard.Response, (request) => this.get("/v1/builders/leaderboard", request)),
        listVolume: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Builders.ListVolume.Request, domain_1.Polymarket.Data.API.Builders.ListVolume.Response, (request) => this.get("/v1/builders/volume", request)),
    };
    accounting = {
        downloadSnapshot: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Data.API.Accounting.DownloadSnapshot.Request, domain_1.Polymarket.Data.API.Accounting.DownloadSnapshot.Response, (request) => this.get("/v1/accounting/snapshot", request, "arraybuffer")),
    };
}
exports.PolymarketDataClient = PolymarketDataClient;
