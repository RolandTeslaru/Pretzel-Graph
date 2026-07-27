import {
    AssetType,
    ClobClient,
    type BalanceAllowanceParams,
    type OpenOrderParams,
    type TradeParams,
} from "@polymarket/clob-client-v2"
import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../../utils"
import { Polymarket } from "../../domain"
import {
    createReadOnlyClobSDK,
    type PolymarketCLOBReadOnlyCredentials,
} from "./common"

/**
 * The L2 read surface: everything an API key can see about its own account, and nothing else.
 *
 * Deliberately not a subset of PolymarketCLOBClient by inheritance or composition — the guarantee
 * this class makes is that the methods aren't here. The whole file can be read in one pass to
 * confirm it places no orders, cancels nothing and moves no allowances.
 */
export class PolymarketReadOnlyCLOBClient {
    readonly #client: ClobClient

    constructor(credentials: PolymarketCLOBReadOnlyCredentials, http: HTTP.ClientAPI) {
        this.#client = createReadOnlyClobSDK(credentials, http)
    }

    public readonly account = {
        getClosedOnlyMode: withAPIParsing(
            Polymarket.CLOB.API.Account.GetClosedOnlyMode.Request,
            Polymarket.CLOB.API.Account.GetClosedOnlyMode.Response,
            () => this.#client.getClosedOnlyMode(),
        ),
    }

    public readonly orders = {
        get: withAPIParsing(
            Polymarket.CLOB.API.Orders.Get.Request,
            Polymarket.CLOB.API.Orders.Get.Response,
            ({ order_id }) => this.#client.getOrder(order_id),
        ),

        listOpen: withAPIParsing(
            Polymarket.CLOB.API.Orders.ListOpen.Request,
            Polymarket.CLOB.API.Orders.ListOpen.Response,
            ({ only_first_page, next_cursor, ...params }) =>
                this.#client.getOpenOrders(
                    params as OpenOrderParams,
                    only_first_page,
                    next_cursor,
                ),
        ),

        listPreMigration: withAPIParsing(
            Polymarket.CLOB.API.Orders.ListPreMigration.Request,
            Polymarket.CLOB.API.Orders.ListPreMigration.Response,
            ({ only_first_page, next_cursor }) =>
                this.#client.getPreMigrationOrders(
                    only_first_page,
                    next_cursor,
                ),
        ),

        isScoring: withAPIParsing(
            Polymarket.CLOB.API.Orders.IsScoring.Request,
            Polymarket.CLOB.API.Orders.IsScoring.Response,
            ({ order_id }) => this.#client.isOrderScoring({ order_id }),
        ),

        areScoring: withAPIParsing(
            Polymarket.CLOB.API.Orders.AreScoring.Request,
            Polymarket.CLOB.API.Orders.AreScoring.Response,
            ({ order_ids }) =>
                this.#client.areOrdersScoring({ orderIds: order_ids }),
        ),
    }

    public readonly trades = {
        list: withAPIParsing(
            Polymarket.CLOB.API.Trades.List.Request,
            Polymarket.CLOB.API.Trades.List.Response,
            ({ only_first_page, next_cursor, ...params }) =>
                this.#client.getTrades(
                    params as TradeParams,
                    only_first_page,
                    next_cursor,
                ),
        ),

        listPaginated: withAPIParsing(
            Polymarket.CLOB.API.Trades.ListPaginated.Request,
            Polymarket.CLOB.API.Trades.ListPaginated.Response,
            ({ next_cursor, ...params }) =>
                this.#client.getTradesPaginated(
                    params as TradeParams,
                    next_cursor,
                ),
        ),
    }

    public readonly balances = {
        getAllowance: withAPIParsing(
            Polymarket.CLOB.API.Balances.GetAllowance.Request,
            Polymarket.CLOB.API.Balances.GetAllowance.Response,
            ({ asset_type, token_id }) =>
                this.#client.getBalanceAllowance({
                    asset_type: asset_type as AssetType,
                    token_id,
                } as BalanceAllowanceParams),
        ),
    }

    public readonly rewards = {
        listDailyEarnings: withAPIParsing(
            Polymarket.CLOB.API.Rewards.ListDailyEarnings.Request,
            Polymarket.CLOB.API.Rewards.ListDailyEarnings.Response,
            ({ date }) => this.#client.getEarningsForUserForDay(date),
        ),

        listDailyTotals: withAPIParsing(
            Polymarket.CLOB.API.Rewards.ListDailyTotals.Request,
            Polymarket.CLOB.API.Rewards.ListDailyTotals.Response,
            ({ date }) => this.#client.getTotalEarningsForUserForDay(date),
        ),

        listUserMarkets: withAPIParsing(
            Polymarket.CLOB.API.Rewards.ListUserMarkets.Request,
            Polymarket.CLOB.API.Rewards.ListUserMarkets.Response,
            ({ date, order_by, position, no_competition }) =>
                this.#client.getUserEarningsAndMarketsConfig(
                    date,
                    order_by,
                    position,
                    no_competition,
                ),
        ),

        getPercentages: withAPIParsing(
            Polymarket.CLOB.API.Rewards.GetPercentages.Request,
            Polymarket.CLOB.API.Rewards.GetPercentages.Response,
            () => this.#client.getRewardPercentages(),
        ),
    }
}

export type { PolymarketCLOBReadOnlyCredentials } from "./common"
