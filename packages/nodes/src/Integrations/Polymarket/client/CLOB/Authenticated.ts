import {
    AssetType,
    ClobClient,
    OrderType,
    type BalanceAllowanceParams,
    type CreateOrderOptions,
    type ExchangeV3OrderAmounts,
    type OpenOrderParams,
    type PostOrdersArgs,
    type SignedOrder,
    type TradeParams,
    type UserMarketOrderV2,
    type UserOrderV2,
} from "@polymarket/clob-client-v2"
import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../../utils"
import { Polymarket } from "../../domain"
import {
    createAuthenticatedClobSDK,
    type PolymarketCLOBCredentials,
} from "./common"

/**
 * Wallet-authenticated CLOB surface. Public discovery and market-data methods
 * live on PolymarketUnauthenticatedCLOBClient instead.
 */
export class PolymarketCLOBClient {
    readonly #client: ClobClient

    constructor(credentials: PolymarketCLOBCredentials, http: HTTP.ClientAPI) {
        this.#client = createAuthenticatedClobSDK(credentials, http)
    }

    public readonly system = {
        heartbeat: withAPIParsing(
            Polymarket.CLOB.API.System.Heartbeat.Request,
            Polymarket.CLOB.API.System.Heartbeat.Response,
            ({ heartbeat_id }) =>
                this.#client.postHeartbeat(heartbeat_id),
        ),
    }

    public readonly account = {
        getClosedOnlyMode: withAPIParsing(
            Polymarket.CLOB.API.Account.GetClosedOnlyMode.Request,
            Polymarket.CLOB.API.Account.GetClosedOnlyMode.Response,
            () => this.#client.getClosedOnlyMode(),
        ),
    }

    public readonly orders = {
        create: withAPIParsing(
            Polymarket.CLOB.API.Orders.Create.Request,
            Polymarket.CLOB.API.Orders.Create.Response,
            ({ order, options }) =>
                this.#client.createOrder(
                    order as UserOrderV2,
                    options as Partial<CreateOrderOptions>,
                ),
        ),

        createMarket: withAPIParsing(
            Polymarket.CLOB.API.Orders.CreateMarket.Request,
            Polymarket.CLOB.API.Orders.CreateMarket.Response,
            ({ order, options }) =>
                this.#client.createMarketOrder(
                    order as UserMarketOrderV2,
                    options as Partial<CreateOrderOptions>,
                ),
        ),

        createExchangeV3: withAPIParsing(
            Polymarket.CLOB.API.Orders.CreateExchangeV3.Request,
            Polymarket.CLOB.API.Orders.CreateExchangeV3.Response,
            (order) =>
                this.#client.createExchangeV3OrderFromAmounts(
                    order as ExchangeV3OrderAmounts,
                ),
        ),

        post: withAPIParsing(
            Polymarket.CLOB.API.Orders.Post.Request,
            Polymarket.CLOB.API.Orders.Post.Response,
            ({ order, order_type, post_only, defer_exec }) =>
                this.#client.postOrder(
                    order as SignedOrder,
                    (order_type ?? "GTC") as OrderType,
                    post_only,
                    defer_exec,
                ),
        ),

        postMany: withAPIParsing(
            Polymarket.CLOB.API.Orders.PostMany.Request,
            Polymarket.CLOB.API.Orders.PostMany.Response,
            ({ orders, post_only, defer_exec }) =>
                this.#client.postOrders(
                    orders.map(({ order, order_type }) => ({
                        order:     order as unknown as SignedOrder,
                        orderType: order_type as OrderType,
                    })) as PostOrdersArgs[],
                    post_only,
                    defer_exec,
                ),
        ),

        createAndPost: withAPIParsing(
            Polymarket.CLOB.API.Orders.CreateAndPost.Request,
            Polymarket.CLOB.API.Orders.CreateAndPost.Response,
            ({ order, options, order_type, post_only, defer_exec }) =>
                this.#client.createAndPostOrder(
                    order as UserOrderV2,
                    options as Partial<CreateOrderOptions>,
                    (order_type ?? "GTC") as OrderType.GTC | OrderType.GTD,
                    post_only,
                    defer_exec,
                ),
        ),

        createAndPostMarket: withAPIParsing(
            Polymarket.CLOB.API.Orders.CreateAndPostMarket.Request,
            Polymarket.CLOB.API.Orders.CreateAndPostMarket.Response,
            ({ order, options, order_type, defer_exec }) =>
                this.#client.createAndPostMarketOrder(
                    order as UserMarketOrderV2,
                    options as Partial<CreateOrderOptions>,
                    (order_type ?? "FOK") as OrderType.FOK | OrderType.FAK,
                    defer_exec,
                ),
        ),

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

        cancel: withAPIParsing(
            Polymarket.CLOB.API.Orders.Cancel.Request,
            Polymarket.CLOB.API.Orders.Cancel.Response,
            ({ order_id }) =>
                this.#client.cancelOrder({ orderID: order_id }),
        ),

        cancelMany: withAPIParsing(
            Polymarket.CLOB.API.Orders.CancelMany.Request,
            Polymarket.CLOB.API.Orders.CancelMany.Response,
            ({ order_ids }) => this.#client.cancelOrders(order_ids),
        ),

        cancelAll: withAPIParsing(
            Polymarket.CLOB.API.Orders.CancelAll.Request,
            Polymarket.CLOB.API.Orders.CancelAll.Response,
            () => this.#client.cancelAll(),
        ),

        cancelMarket: withAPIParsing(
            Polymarket.CLOB.API.Orders.CancelMarket.Request,
            Polymarket.CLOB.API.Orders.CancelMarket.Response,
            (request) => this.#client.cancelMarketOrders(request),
        ),

        isScoring: withAPIParsing(
            Polymarket.CLOB.API.Orders.IsScoring.Request,
            Polymarket.CLOB.API.Orders.IsScoring.Response,
            ({ order_id }) =>
                this.#client.isOrderScoring({ order_id }),
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

        updateAllowance: withAPIParsing(
            Polymarket.CLOB.API.Balances.UpdateAllowance.Request,
            Polymarket.CLOB.API.Balances.UpdateAllowance.Response,
            ({ asset_type, token_id }) =>
                this.#client.updateBalanceAllowance({
                    asset_type: asset_type as AssetType,
                    token_id,
                } as BalanceAllowanceParams),
        ),
    }

    public readonly notifications = {
        list: withAPIParsing(
            Polymarket.CLOB.API.Notifications.List.Request,
            Polymarket.CLOB.API.Notifications.List.Response,
            () => this.#client.getNotifications(),
        ),

        delete: withAPIParsing(
            Polymarket.CLOB.API.Notifications.Delete.Request,
            Polymarket.CLOB.API.Notifications.Delete.Response,
            ({ ids }) =>
                this.#client.dropNotifications(ids ? { ids } : undefined),
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

export type {
    PolymarketCLOBCredentials,
    PolymarketCLOBWalletCredentials,
} from "./common"
