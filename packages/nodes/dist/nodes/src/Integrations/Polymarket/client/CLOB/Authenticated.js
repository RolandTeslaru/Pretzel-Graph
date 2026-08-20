"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketCLOBClient = void 0;
const utils_1 = require("../../../../utils");
const domain_1 = require("../../domain");
const common_1 = require("./common");
/**
 * Wallet-authenticated CLOB surface. Public discovery and market-data methods
 * live on PolymarketUnauthenticatedCLOBClient instead.
 */
class PolymarketCLOBClient {
    #client;
    constructor(credentials, http) {
        this.#client = (0, common_1.createAuthenticatedClobSDK)(credentials, http);
    }
    system = {
        heartbeat: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.System.Heartbeat.Request, domain_1.Polymarket.CLOB.API.System.Heartbeat.Response, ({ heartbeat_id }) => this.#client.postHeartbeat(heartbeat_id)),
    };
    account = {
        getClosedOnlyMode: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Account.GetClosedOnlyMode.Request, domain_1.Polymarket.CLOB.API.Account.GetClosedOnlyMode.Response, () => this.#client.getClosedOnlyMode()),
    };
    orders = {
        create: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.Create.Request, domain_1.Polymarket.CLOB.API.Orders.Create.Response, ({ order, options }) => this.#client.createOrder(order, options)),
        createMarket: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.CreateMarket.Request, domain_1.Polymarket.CLOB.API.Orders.CreateMarket.Response, ({ order, options }) => this.#client.createMarketOrder(order, options)),
        createExchangeV3: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.CreateExchangeV3.Request, domain_1.Polymarket.CLOB.API.Orders.CreateExchangeV3.Response, (order) => this.#client.createExchangeV3OrderFromAmounts(order)),
        post: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.Post.Request, domain_1.Polymarket.CLOB.API.Orders.Post.Response, ({ order, order_type, post_only, defer_exec }) => this.#client.postOrder(order, (order_type ?? "GTC"), post_only, defer_exec)),
        postMany: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.PostMany.Request, domain_1.Polymarket.CLOB.API.Orders.PostMany.Response, ({ orders, post_only, defer_exec }) => this.#client.postOrders(orders.map(({ order, order_type }) => ({
            order: order,
            orderType: order_type,
        })), post_only, defer_exec)),
        createAndPost: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.CreateAndPost.Request, domain_1.Polymarket.CLOB.API.Orders.CreateAndPost.Response, ({ order, options, order_type, post_only, defer_exec }) => this.#client.createAndPostOrder(order, options, (order_type ?? "GTC"), post_only, defer_exec)),
        createAndPostMarket: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.CreateAndPostMarket.Request, domain_1.Polymarket.CLOB.API.Orders.CreateAndPostMarket.Response, ({ order, options, order_type, defer_exec }) => this.#client.createAndPostMarketOrder(order, options, (order_type ?? "FOK"), defer_exec)),
        get: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.Get.Request, domain_1.Polymarket.CLOB.API.Orders.Get.Response, ({ order_id }) => this.#client.getOrder(order_id)),
        listOpen: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.ListOpen.Request, domain_1.Polymarket.CLOB.API.Orders.ListOpen.Response, ({ only_first_page, next_cursor, ...params }) => this.#client.getOpenOrders(params, only_first_page, next_cursor)),
        listPreMigration: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.ListPreMigration.Request, domain_1.Polymarket.CLOB.API.Orders.ListPreMigration.Response, ({ only_first_page, next_cursor }) => this.#client.getPreMigrationOrders(only_first_page, next_cursor)),
        cancel: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.Cancel.Request, domain_1.Polymarket.CLOB.API.Orders.Cancel.Response, ({ order_id }) => this.#client.cancelOrder({ orderID: order_id })),
        cancelMany: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.CancelMany.Request, domain_1.Polymarket.CLOB.API.Orders.CancelMany.Response, ({ order_ids }) => this.#client.cancelOrders(order_ids)),
        cancelAll: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.CancelAll.Request, domain_1.Polymarket.CLOB.API.Orders.CancelAll.Response, () => this.#client.cancelAll()),
        cancelMarket: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.CancelMarket.Request, domain_1.Polymarket.CLOB.API.Orders.CancelMarket.Response, (request) => this.#client.cancelMarketOrders(request)),
        isScoring: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.IsScoring.Request, domain_1.Polymarket.CLOB.API.Orders.IsScoring.Response, ({ order_id }) => this.#client.isOrderScoring({ order_id })),
        areScoring: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.AreScoring.Request, domain_1.Polymarket.CLOB.API.Orders.AreScoring.Response, ({ order_ids }) => this.#client.areOrdersScoring({ orderIds: order_ids })),
    };
    trades = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Trades.List.Request, domain_1.Polymarket.CLOB.API.Trades.List.Response, ({ only_first_page, next_cursor, ...params }) => this.#client.getTrades(params, only_first_page, next_cursor)),
        listPaginated: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Trades.ListPaginated.Request, domain_1.Polymarket.CLOB.API.Trades.ListPaginated.Response, ({ next_cursor, ...params }) => this.#client.getTradesPaginated(params, next_cursor)),
    };
    balances = {
        getAllowance: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Balances.GetAllowance.Request, domain_1.Polymarket.CLOB.API.Balances.GetAllowance.Response, ({ asset_type, token_id }) => this.#client.getBalanceAllowance({
            asset_type: asset_type,
            token_id,
        })),
        updateAllowance: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Balances.UpdateAllowance.Request, domain_1.Polymarket.CLOB.API.Balances.UpdateAllowance.Response, ({ asset_type, token_id }) => this.#client.updateBalanceAllowance({
            asset_type: asset_type,
            token_id,
        })),
    };
    notifications = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Notifications.List.Request, domain_1.Polymarket.CLOB.API.Notifications.List.Response, () => this.#client.getNotifications()),
        delete: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Notifications.Delete.Request, domain_1.Polymarket.CLOB.API.Notifications.Delete.Response, ({ ids }) => this.#client.dropNotifications(ids ? { ids } : undefined)),
    };
    rewards = {
        listDailyEarnings: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.ListDailyEarnings.Request, domain_1.Polymarket.CLOB.API.Rewards.ListDailyEarnings.Response, ({ date }) => this.#client.getEarningsForUserForDay(date)),
        listDailyTotals: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.ListDailyTotals.Request, domain_1.Polymarket.CLOB.API.Rewards.ListDailyTotals.Response, ({ date }) => this.#client.getTotalEarningsForUserForDay(date)),
        listUserMarkets: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.ListUserMarkets.Request, domain_1.Polymarket.CLOB.API.Rewards.ListUserMarkets.Response, ({ date, order_by, position, no_competition }) => this.#client.getUserEarningsAndMarketsConfig(date, order_by, position, no_competition)),
        getPercentages: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.GetPercentages.Request, domain_1.Polymarket.CLOB.API.Rewards.GetPercentages.Response, () => this.#client.getRewardPercentages()),
    };
}
exports.PolymarketCLOBClient = PolymarketCLOBClient;
