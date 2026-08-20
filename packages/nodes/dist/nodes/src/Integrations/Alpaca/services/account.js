"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaAccountService = void 0;
const domain_1 = require("../domain");
const common_1 = require("../domain/common");
const collect = async (source, maximum) => {
    const values = [];
    for await (const value of source) {
        values.push(value);
        if (values.length >= maximum)
            break;
    }
    return values;
};
class AlpacaAccountService {
    client;
    constructor(client) {
        this.client = client;
    }
    summary = async () => domain_1.Alpaca.Account.Summary.fromAPI(await this.client.trading.account.getAccount());
    configuration = async () => (0, common_1.plain)(await this.client.trading.accountConfigurations.getAccountConfig());
    positions = {
        list: async () => (await this.client.trading.positions.getAllOpenPositions())
            .map(domain_1.Alpaca.Account.Position.fromAPI),
        get: async (symbolOrId) => domain_1.Alpaca.Account.Position.fromAPI(await this.client.trading.positions.getOpenPosition({
            symbolOrAssetId: (0, common_1.required)(symbolOrId, "symbolOrId"),
        })),
    };
    orders = {
        list: async (args) => (await this.client.trading.orders.getAllOrders({
            status: args.status ?? "open",
            symbols: args.symbols?.map(value => value.trim().toUpperCase()).filter(Boolean),
            side: args.side,
            direction: args.direction ?? "desc",
            after: (0, common_1.optionalDate)(args.after, "after")?.toISOString(),
            until: (0, common_1.optionalDate)(args.until, "until")?.toISOString(),
            limit: (0, common_1.bounded)(args.limit, 50, 500),
        })).map(domain_1.Alpaca.Trading.Order.fromAPI),
        get: async (orderId) => domain_1.Alpaca.Trading.Order.fromAPI(await this.client.trading.orders.getOrderByOrderID({
            orderId: (0, common_1.required)(orderId, "orderId"),
        })),
    };
    activities = async (args) => {
        const maximum = (0, common_1.bounded)(args.limit, 50, 500);
        const values = await collect(this.client.trading.iterateActivities({
            activityTypes: args.activityTypes,
            category: args.category,
            direction: args.direction ?? "desc",
            after: (0, common_1.optionalDate)(args.after, "after"),
            until: (0, common_1.optionalDate)(args.until, "until"),
            pageSize: Math.min(maximum, 100),
        }), maximum);
        return values.map(common_1.plain);
    };
    portfolio = async (args) => domain_1.Alpaca.Account.Portfolio.fromAPI(await this.client.trading.portfolioHistory.getAccountPortfolioHistory({
        period: args.period ?? "1M",
        timeframe: args.timeframe ?? "1D",
        start: (0, common_1.optionalDate)(args.start, "start"),
        end: (0, common_1.optionalDate)(args.end, "end"),
        extendedHours: args.extendedHours === undefined
            ? undefined
            : String(args.extendedHours),
    }));
    watchlists = {
        list: async () => (await this.client.trading.watchlists.getWatchlists())
            .map(domain_1.Alpaca.Account.Watchlist.fromAPI),
        get: async (args) => {
            if (args.id?.trim())
                return domain_1.Alpaca.Account.Watchlist.fromAPI(await this.client.trading.watchlists.getWatchlistById({
                    watchlistId: args.id.trim(),
                }));
            return domain_1.Alpaca.Account.Watchlist.fromAPI(await this.client.trading.watchlists.getWatchlistByName({
                name: (0, common_1.required)(args.name ?? "", "name"),
            }));
        },
    };
}
exports.AlpacaAccountService = AlpacaAccountService;
