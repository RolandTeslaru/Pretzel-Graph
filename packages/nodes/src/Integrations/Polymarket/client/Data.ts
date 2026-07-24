import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../utils"
import { Polymarket } from "../domain"

export const POLYMARKET_DATA_BASE_URL = "https://data-api.polymarket.com"

export class PolymarketDataClient {
    readonly #client: HTTP.Client

    constructor(http: HTTP.ClientAPI) {
        this.#client = http.create({
            vendor:  "Polymarket",
            baseURL: POLYMARKET_DATA_BASE_URL,
            headers: { "User-Agent": "PretzelGraph/1.0" },
            // Data API arrays are comma-separated: ?market=id1,id2.
            paramsSerializer: {
                serialize: (params) => {
                    const query = new URLSearchParams()

                    for (const [key, value] of Object.entries(params)) {
                        if (value === undefined)
                            continue

                        query.set(
                            key,
                            Array.isArray(value)
                                ? value.join(",")
                                : String(value),
                        )
                    }

                    return query.toString()
                },
            },
        })
    }

    private async get(
        path: string,
        params?: object,
        responseType?: "arraybuffer",
    ): Promise<unknown> {
        return this.#client.get<unknown>(path, {
            params,
            responseType,
        })
    }

    public readonly status = {
        get: withAPIParsing(
            Polymarket.Data.API.Status.Get.Request,
            Polymarket.Data.API.Status.Get.Response,
            () => this.get("/"),
        ),
    }

    public readonly positions = {
        listCurrent: withAPIParsing(
            Polymarket.Data.API.Positions.ListCurrent.Request,
            Polymarket.Data.API.Positions.ListCurrent.Response,
            (request) => this.get("/positions", request),
        ),

        listClosed: withAPIParsing(
            Polymarket.Data.API.Positions.ListClosed.Request,
            Polymarket.Data.API.Positions.ListClosed.Response,
            (request) => this.get("/closed-positions", request),
        ),

        listForMarket: withAPIParsing(
            Polymarket.Data.API.Positions.ListForMarket.Request,
            Polymarket.Data.API.Positions.ListForMarket.Response,
            (request) => this.get("/v1/market-positions", request),
        ),

        listCombos: withAPIParsing(
            Polymarket.Data.API.Positions.ListCombos.Request,
            Polymarket.Data.API.Positions.ListCombos.Response,
            (request) => this.get("/v1/positions/combos", request),
        ),
    }

    public readonly trades = {
        list: withAPIParsing(
            Polymarket.Data.API.Trades.List.Request,
            Polymarket.Data.API.Trades.List.Response,
            (request) => this.get("/trades", request),
        ),
    }

    public readonly activity = {
        list: withAPIParsing(
            Polymarket.Data.API.Activity.List.Request,
            Polymarket.Data.API.Activity.List.Response,
            (request) => this.get("/activity", request),
        ),

        listCombos: withAPIParsing(
            Polymarket.Data.API.Activity.ListCombos.Request,
            Polymarket.Data.API.Activity.ListCombos.Response,
            (request) => this.get("/v1/activity/combos", request),
        ),
    }

    public readonly users = {
        getValue: withAPIParsing(
            Polymarket.Data.API.Users.GetValue.Request,
            Polymarket.Data.API.Users.GetValue.Response,
            (request) => this.get("/value", request),
        ),

        getTradedMarketCount: withAPIParsing(
            Polymarket.Data.API.Users.GetTradedMarketCount.Request,
            Polymarket.Data.API.Users.GetTradedMarketCount.Response,
            (request) => this.get("/traded", request),
        ),
    }

    public readonly markets = {
        listHolders: withAPIParsing(
            Polymarket.Data.API.Markets.ListHolders.Request,
            Polymarket.Data.API.Markets.ListHolders.Response,
            (request) => this.get("/holders", request),
        ),

        getOpenInterest: withAPIParsing(
            Polymarket.Data.API.Markets.GetOpenInterest.Request,
            Polymarket.Data.API.Markets.GetOpenInterest.Response,
            (request) => this.get("/oi", request),
        ),

        getLiveVolume: withAPIParsing(
            Polymarket.Data.API.Markets.GetLiveVolume.Request,
            Polymarket.Data.API.Markets.GetLiveVolume.Response,
            (request) => this.get("/live-volume", request),
        ),
    }

    public readonly leaderboard = {
        list: withAPIParsing(
            Polymarket.Data.API.Leaderboard.List.Request,
            Polymarket.Data.API.Leaderboard.List.Response,
            (request) => this.get("/v1/leaderboard", request),
        ),
    }

    public readonly builders = {
        listLeaderboard: withAPIParsing(
            Polymarket.Data.API.Builders.ListLeaderboard.Request,
            Polymarket.Data.API.Builders.ListLeaderboard.Response,
            (request) => this.get("/v1/builders/leaderboard", request),
        ),

        listVolume: withAPIParsing(
            Polymarket.Data.API.Builders.ListVolume.Request,
            Polymarket.Data.API.Builders.ListVolume.Response,
            (request) => this.get("/v1/builders/volume", request),
        ),
    }

    public readonly accounting = {
        downloadSnapshot: withAPIParsing(
            Polymarket.Data.API.Accounting.DownloadSnapshot.Request,
            Polymarket.Data.API.Accounting.DownloadSnapshot.Response,
            (request) =>
                this.get(
                    "/v1/accounting/snapshot",
                    request,
                    "arraybuffer",
                ),
        ),
    }
}
