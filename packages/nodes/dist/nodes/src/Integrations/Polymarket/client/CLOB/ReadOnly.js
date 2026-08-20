"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketReadOnlyCLOBClient = void 0;
const utils_1 = require("../../../../utils");
const domain_1 = require("../../domain");
const common_1 = require("./common");
/**
 * The L2 read surface: everything an API key can see about its own account, and nothing else.
 *
 * Deliberately not a subset of PolymarketCLOBClient by inheritance or composition — the guarantee
 * this class makes is that the methods aren't here. The whole file can be read in one pass to
 * confirm it places no orders, cancels nothing and moves no allowances.
 */
class PolymarketReadOnlyCLOBClient {
    #client;
    constructor(credentials, http) {
        this.#client = (0, common_1.createReadOnlyClobSDK)(credentials, http);
    }
    account = {
        getClosedOnlyMode: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Account.GetClosedOnlyMode.Request, domain_1.Polymarket.CLOB.API.Account.GetClosedOnlyMode.Response, () => this.#client.getClosedOnlyMode()),
    };
    orders = {
        get: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.Get.Request, domain_1.Polymarket.CLOB.API.Orders.Get.Response, ({ order_id }) => this.#client.getOrder(order_id)),
        listOpen: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.ListOpen.Request, domain_1.Polymarket.CLOB.API.Orders.ListOpen.Response, ({ only_first_page, next_cursor, ...params }) => this.#client.getOpenOrders(params, only_first_page, next_cursor)),
        listPreMigration: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Orders.ListPreMigration.Request, domain_1.Polymarket.CLOB.API.Orders.ListPreMigration.Response, ({ only_first_page, next_cursor }) => this.#client.getPreMigrationOrders(only_first_page, next_cursor)),
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
    };
    rewards = {
        listDailyEarnings: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.ListDailyEarnings.Request, domain_1.Polymarket.CLOB.API.Rewards.ListDailyEarnings.Response, ({ date }) => this.#client.getEarningsForUserForDay(date)),
        listDailyTotals: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.ListDailyTotals.Request, domain_1.Polymarket.CLOB.API.Rewards.ListDailyTotals.Response, ({ date }) => this.#client.getTotalEarningsForUserForDay(date)),
        listUserMarkets: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.ListUserMarkets.Request, domain_1.Polymarket.CLOB.API.Rewards.ListUserMarkets.Response, ({ date, order_by, position, no_competition }) => this.#client.getUserEarningsAndMarketsConfig(date, order_by, position, no_competition)),
        getPercentages: (0, utils_1.withAPIParsing)(domain_1.Polymarket.CLOB.API.Rewards.GetPercentages.Request, domain_1.Polymarket.CLOB.API.Rewards.GetPercentages.Response, () => this.#client.getRewardPercentages()),
    };
}
exports.PolymarketReadOnlyCLOBClient = PolymarketReadOnlyCLOBClient;
