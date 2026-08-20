"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOBAPI = void 0;
const zod_1 = require("zod");
const CLOB = __importStar(require("./schemas"));
// Ids end up in a URL path or query string, where encodeURIComponent preserves stray whitespace
// as %20 rather than dropping it — so an untrimmed id 404s instead of failing loudly. Trimming at
// the request boundary covers every caller: node fields and agent-supplied tool arguments alike.
const ConditionIdValue = zod_1.z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/, "must be a 0x-prefixed, 64-character hex condition id");
const TokenIdValue = zod_1.z.string().trim().min(1, "must not be empty");
const ConditionId = zod_1.z.object({ condition_id: ConditionIdValue });
const TokenId = zod_1.z.object({ token_id: TokenIdValue });
const OrderId = zod_1.z.object({ order_id: zod_1.z.string().trim().min(1, "must not be empty") });
const DateQuery = zod_1.z.object({
    date: zod_1.z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a YYYY-MM-DD date"),
});
const MarketsPage = CLOB.Common.Paginated(CLOB.Market.Schema);
const SimplifiedMarketsPage = CLOB.Common.Paginated(CLOB.Market.Simplified);
var CLOBAPI;
(function (CLOBAPI) {
    /** Health, version and clock endpoints; heartbeat requires L2 authentication. */
    let System;
    (function (System) {
        let Status;
        (function (Status) {
            Status.Request = CLOB.Common.Empty;
            Status.Response = zod_1.z.string();
        })(Status = System.Status || (System.Status = {}));
        let Version;
        (function (Version) {
            Version.Request = CLOB.Common.Empty;
            Version.Response = zod_1.z.number();
        })(Version = System.Version || (System.Version = {}));
        let Time;
        (function (Time) {
            Time.Request = CLOB.Common.Empty;
            Time.Response = zod_1.z.number();
        })(Time = System.Time || (System.Time = {}));
        let Heartbeat;
        (function (Heartbeat) {
            Heartbeat.Request = zod_1.z.object({
                heartbeat_id: zod_1.z.string().optional(),
            }).prefault({});
            Heartbeat.Response = zod_1.z.object({
                heartbeat_id: zod_1.z.string(),
                error_msg: zod_1.z.string().optional(),
            }).loose();
        })(Heartbeat = System.Heartbeat || (System.Heartbeat = {}));
    })(System = CLOBAPI.System || (CLOBAPI.System = {}));
    /** CLOB-native market configuration used by the matching engine. */
    let Markets;
    (function (Markets) {
        let List;
        (function (List) {
            List.Request = CLOB.Common.Cursor;
            List.Response = MarketsPage;
        })(List = Markets.List || (Markets.List = {}));
        let ListSampling;
        (function (ListSampling) {
            ListSampling.Request = CLOB.Common.Cursor;
            ListSampling.Response = MarketsPage;
        })(ListSampling = Markets.ListSampling || (Markets.ListSampling = {}));
        let ListSimplified;
        (function (ListSimplified) {
            ListSimplified.Request = CLOB.Common.Cursor;
            ListSimplified.Response = SimplifiedMarketsPage;
        })(ListSimplified = Markets.ListSimplified || (Markets.ListSimplified = {}));
        let ListSamplingSimplified;
        (function (ListSamplingSimplified) {
            ListSamplingSimplified.Request = CLOB.Common.Cursor;
            ListSamplingSimplified.Response = SimplifiedMarketsPage;
        })(ListSamplingSimplified = Markets.ListSamplingSimplified || (Markets.ListSamplingSimplified = {}));
        let Get;
        (function (Get) {
            Get.Request = ConditionId;
            Get.Response = CLOB.Market.Schema;
        })(Get = Markets.Get || (Markets.Get = {}));
        let GetClobInfo;
        (function (GetClobInfo) {
            GetClobInfo.Request = ConditionId;
            GetClobInfo.Response = CLOB.Market.ClobInfo;
        })(GetClobInfo = Markets.GetClobInfo || (Markets.GetClobInfo = {}));
    })(Markets = CLOBAPI.Markets || (CLOBAPI.Markets = {}));
    /** Public order-book and price endpoints; no wallet or API key is required. */
    let MarketData;
    (function (MarketData) {
        let GetOrderBook;
        (function (GetOrderBook) {
            GetOrderBook.Request = TokenId;
            GetOrderBook.Response = CLOB.OrderBook.Schema;
        })(GetOrderBook = MarketData.GetOrderBook || (MarketData.GetOrderBook = {}));
        let GetOrderBooks;
        (function (GetOrderBooks) {
            GetOrderBooks.Request = zod_1.z.object({
                params: zod_1.z.array(CLOB.Common.BookParams),
            });
            GetOrderBooks.Response = zod_1.z.array(CLOB.OrderBook.Schema);
        })(GetOrderBooks = MarketData.GetOrderBooks || (MarketData.GetOrderBooks = {}));
        let GetTickSize;
        (function (GetTickSize) {
            GetTickSize.Request = TokenId;
            GetTickSize.Response = CLOB.Common.TickSize;
        })(GetTickSize = MarketData.GetTickSize || (MarketData.GetTickSize = {}));
        let GetNegRisk;
        (function (GetNegRisk) {
            GetNegRisk.Request = TokenId;
            GetNegRisk.Response = zod_1.z.boolean();
        })(GetNegRisk = MarketData.GetNegRisk || (MarketData.GetNegRisk = {}));
        let GetFeeRate;
        (function (GetFeeRate) {
            GetFeeRate.Request = TokenId;
            GetFeeRate.Response = zod_1.z.number();
        })(GetFeeRate = MarketData.GetFeeRate || (MarketData.GetFeeRate = {}));
        let GetFeeExponent;
        (function (GetFeeExponent) {
            GetFeeExponent.Request = TokenId;
            GetFeeExponent.Response = zod_1.z.number();
        })(GetFeeExponent = MarketData.GetFeeExponent || (MarketData.GetFeeExponent = {}));
        let GetMidpoint;
        (function (GetMidpoint) {
            GetMidpoint.Request = TokenId;
            GetMidpoint.Response = CLOB.MarketData.Midpoint;
        })(GetMidpoint = MarketData.GetMidpoint || (MarketData.GetMidpoint = {}));
        let GetMidpoints;
        (function (GetMidpoints) {
            GetMidpoints.Request = zod_1.z.object({
                params: zod_1.z.array(CLOB.Common.BookParams),
            });
            GetMidpoints.Response = zod_1.z.record(zod_1.z.string(), zod_1.z.string());
        })(GetMidpoints = MarketData.GetMidpoints || (MarketData.GetMidpoints = {}));
        let GetPrice;
        (function (GetPrice) {
            GetPrice.Request = TokenId.extend({
                side: CLOB.Common.Side,
            });
            GetPrice.Response = CLOB.MarketData.Price;
        })(GetPrice = MarketData.GetPrice || (MarketData.GetPrice = {}));
        let GetPrices;
        (function (GetPrices) {
            GetPrices.Request = zod_1.z.object({
                params: zod_1.z.array(CLOB.Common.BookParams),
            });
            GetPrices.Response = zod_1.z.record(zod_1.z.string(), zod_1.z.object({
                BUY: zod_1.z.string().optional(),
                SELL: zod_1.z.string().optional(),
            }).loose());
        })(GetPrices = MarketData.GetPrices || (MarketData.GetPrices = {}));
        let GetSpread;
        (function (GetSpread) {
            GetSpread.Request = TokenId;
            GetSpread.Response = CLOB.MarketData.Spread;
        })(GetSpread = MarketData.GetSpread || (MarketData.GetSpread = {}));
        let GetSpreads;
        (function (GetSpreads) {
            GetSpreads.Request = zod_1.z.object({
                params: zod_1.z.array(CLOB.Common.BookParams),
            });
            GetSpreads.Response = zod_1.z.record(zod_1.z.string(), zod_1.z.string());
        })(GetSpreads = MarketData.GetSpreads || (MarketData.GetSpreads = {}));
        let GetLastTradePrice;
        (function (GetLastTradePrice) {
            GetLastTradePrice.Request = TokenId;
            GetLastTradePrice.Response = CLOB.MarketData.LastTradePrice;
        })(GetLastTradePrice = MarketData.GetLastTradePrice || (MarketData.GetLastTradePrice = {}));
        let GetLastTradePrices;
        (function (GetLastTradePrices) {
            GetLastTradePrices.Request = zod_1.z.object({
                params: zod_1.z.array(CLOB.Common.BookParams),
            });
            GetLastTradePrices.Response = zod_1.z.array(CLOB.MarketData.BatchValue);
        })(GetLastTradePrices = MarketData.GetLastTradePrices || (MarketData.GetLastTradePrices = {}));
        let GetPriceHistory;
        (function (GetPriceHistory) {
            GetPriceHistory.Request = zod_1.z.object({
                market: zod_1.z.string().optional(),
                startTs: zod_1.z.number().optional(),
                endTs: zod_1.z.number().optional(),
                fidelity: zod_1.z.number().optional(),
                interval: CLOB.Common.PriceHistoryInterval.optional(),
            }).prefault({});
            // The endpoint wraps the series in { history: [...] }; unwrapped here so callers get
            // the series itself, the way every other list-shaped response arrives.
            GetPriceHistory.Response = zod_1.z
                .object({ history: zod_1.z.array(CLOB.MarketData.PricePoint) })
                .transform(body => body.history);
        })(GetPriceHistory = MarketData.GetPriceHistory || (MarketData.GetPriceHistory = {}));
        let HashOrderBook;
        (function (HashOrderBook) {
            HashOrderBook.Request = zod_1.z.object({
                order_book: CLOB.OrderBook.Schema,
            });
            HashOrderBook.Response = zod_1.z.string();
        })(HashOrderBook = MarketData.HashOrderBook || (MarketData.HashOrderBook = {}));
        let CalculateMarketPrice;
        (function (CalculateMarketPrice) {
            CalculateMarketPrice.Request = TokenId.extend({
                side: CLOB.Common.Side,
                amount: zod_1.z.number().positive(),
                order_type: CLOB.Common.OrderType.optional(),
            });
            CalculateMarketPrice.Response = zod_1.z.number();
        })(CalculateMarketPrice = MarketData.CalculateMarketPrice || (MarketData.CalculateMarketPrice = {}));
    })(MarketData = CLOBAPI.MarketData || (CLOBAPI.MarketData = {}));
    /** Authenticated account state. */
    let Account;
    (function (Account) {
        let GetClosedOnlyMode;
        (function (GetClosedOnlyMode) {
            GetClosedOnlyMode.Request = CLOB.Common.Empty;
            GetClosedOnlyMode.Response = zod_1.z.object({
                closed_only: zod_1.z.boolean(),
            }).loose();
        })(GetClosedOnlyMode = Account.GetClosedOnlyMode || (Account.GetClosedOnlyMode = {}));
    })(Account = CLOBAPI.Account || (CLOBAPI.Account = {}));
    /** Local order signing plus authenticated placement, query and cancellation. */
    let Orders;
    (function (Orders) {
        let Create;
        (function (Create) {
            Create.Request = zod_1.z.object({
                order: CLOB.Order.Limit,
                options: CLOB.Order.CreateOptions.optional(),
            });
            Create.Response = CLOB.Order.Signed;
        })(Create = Orders.Create || (Orders.Create = {}));
        let CreateMarket;
        (function (CreateMarket) {
            CreateMarket.Request = zod_1.z.object({
                order: CLOB.Order.Market,
                options: CLOB.Order.CreateOptions.optional(),
            });
            CreateMarket.Response = CLOB.Order.Signed;
        })(CreateMarket = Orders.CreateMarket || (Orders.CreateMarket = {}));
        let CreateExchangeV3;
        (function (CreateExchangeV3) {
            CreateExchangeV3.Request = CLOB.Order.ExchangeV3Amounts;
            CreateExchangeV3.Response = CLOB.Order.Signed;
        })(CreateExchangeV3 = Orders.CreateExchangeV3 || (Orders.CreateExchangeV3 = {}));
        let Post;
        (function (Post) {
            Post.Request = zod_1.z.object({
                order: CLOB.Order.Signed,
                order_type: CLOB.Common.OrderType.optional(),
                post_only: zod_1.z.boolean().optional(),
                defer_exec: zod_1.z.boolean().optional(),
            });
            Post.Response = CLOB.Order.Response;
        })(Post = Orders.Post || (Orders.Post = {}));
        let PostMany;
        (function (PostMany) {
            PostMany.Request = zod_1.z.object({
                orders: zod_1.z.array(zod_1.z.object({
                    order: CLOB.Order.Signed,
                    order_type: CLOB.Common.OrderType,
                })),
                post_only: zod_1.z.boolean().optional(),
                defer_exec: zod_1.z.boolean().optional(),
            });
            PostMany.Response = zod_1.z.array(CLOB.Order.Response);
        })(PostMany = Orders.PostMany || (Orders.PostMany = {}));
        let CreateAndPost;
        (function (CreateAndPost) {
            CreateAndPost.Request = Create.Request.extend({
                order_type: zod_1.z.enum(["GTC", "GTD"]).optional(),
                post_only: zod_1.z.boolean().optional(),
                defer_exec: zod_1.z.boolean().optional(),
            });
            CreateAndPost.Response = CLOB.Order.Response;
        })(CreateAndPost = Orders.CreateAndPost || (Orders.CreateAndPost = {}));
        let CreateAndPostMarket;
        (function (CreateAndPostMarket) {
            CreateAndPostMarket.Request = CreateMarket.Request.extend({
                order_type: zod_1.z.enum(["FOK", "FAK"]).optional(),
                defer_exec: zod_1.z.boolean().optional(),
            });
            CreateAndPostMarket.Response = CLOB.Order.Response;
        })(CreateAndPostMarket = Orders.CreateAndPostMarket || (Orders.CreateAndPostMarket = {}));
        let Get;
        (function (Get) {
            Get.Request = OrderId;
            Get.Response = CLOB.Order.Open;
        })(Get = Orders.Get || (Orders.Get = {}));
        let ListOpen;
        (function (ListOpen) {
            ListOpen.Request = zod_1.z.object({
                id: zod_1.z.string().optional(),
                market: zod_1.z.string().optional(),
                asset_id: zod_1.z.string().optional(),
                only_first_page: zod_1.z.boolean().optional(),
                next_cursor: zod_1.z.string().optional(),
            }).prefault({});
            ListOpen.Response = zod_1.z.array(CLOB.Order.Open);
        })(ListOpen = Orders.ListOpen || (Orders.ListOpen = {}));
        let ListPreMigration;
        (function (ListPreMigration) {
            ListPreMigration.Request = zod_1.z.object({
                only_first_page: zod_1.z.boolean().optional(),
                next_cursor: zod_1.z.string().optional(),
            }).prefault({});
            ListPreMigration.Response = zod_1.z.array(CLOB.Order.Open);
        })(ListPreMigration = Orders.ListPreMigration || (Orders.ListPreMigration = {}));
        let Cancel;
        (function (Cancel) {
            Cancel.Request = OrderId;
            Cancel.Response = CLOB.Order.CancelResponse;
        })(Cancel = Orders.Cancel || (Orders.Cancel = {}));
        let CancelMany;
        (function (CancelMany) {
            CancelMany.Request = zod_1.z.object({
                order_ids: zod_1.z.array(zod_1.z.string()),
            });
            CancelMany.Response = CLOB.Order.CancelResponse;
        })(CancelMany = Orders.CancelMany || (Orders.CancelMany = {}));
        let CancelAll;
        (function (CancelAll) {
            CancelAll.Request = CLOB.Common.Empty;
            CancelAll.Response = CLOB.Order.CancelResponse;
        })(CancelAll = Orders.CancelAll || (Orders.CancelAll = {}));
        let CancelMarket;
        (function (CancelMarket) {
            CancelMarket.Request = zod_1.z.object({
                market: zod_1.z.string().optional(),
                asset_id: zod_1.z.string().optional(),
            }).prefault({});
            CancelMarket.Response = CLOB.Order.CancelResponse;
        })(CancelMarket = Orders.CancelMarket || (Orders.CancelMarket = {}));
        let IsScoring;
        (function (IsScoring) {
            IsScoring.Request = OrderId;
            IsScoring.Response = zod_1.z.object({
                scoring: zod_1.z.boolean(),
            }).loose();
        })(IsScoring = Orders.IsScoring || (Orders.IsScoring = {}));
        let AreScoring;
        (function (AreScoring) {
            AreScoring.Request = zod_1.z.object({
                order_ids: zod_1.z.array(zod_1.z.string()),
            });
            AreScoring.Response = zod_1.z.record(zod_1.z.string(), zod_1.z.boolean());
        })(AreScoring = Orders.AreScoring || (Orders.AreScoring = {}));
    })(Orders = CLOBAPI.Orders || (CLOBAPI.Orders = {}));
    /** User fills require authentication; market trade events are public. */
    let Trades;
    (function (Trades) {
        Trades.Query = zod_1.z.object({
            id: zod_1.z.string().optional(),
            maker_address: zod_1.z.string().optional(),
            market: zod_1.z.string().optional(),
            asset_id: zod_1.z.string().optional(),
            before: zod_1.z.string().optional(),
            after: zod_1.z.string().optional(),
            only_first_page: zod_1.z.boolean().optional(),
            next_cursor: zod_1.z.string().optional(),
        });
        let List;
        (function (List) {
            List.Request = Trades.Query.prefault({});
            List.Response = zod_1.z.array(CLOB.Trade.Schema);
        })(List = Trades.List || (Trades.List = {}));
        let ListPaginated;
        (function (ListPaginated) {
            ListPaginated.Request = Trades.Query.omit({ only_first_page: true }).prefault({});
            ListPaginated.Response = CLOB.Trade.Paginated;
        })(ListPaginated = Trades.ListPaginated || (Trades.ListPaginated = {}));
        let ListMarketEvents;
        (function (ListMarketEvents) {
            ListMarketEvents.Request = ConditionId;
            ListMarketEvents.Response = zod_1.z.array(CLOB.MarketTradeEvent.Schema);
        })(ListMarketEvents = Trades.ListMarketEvents || (Trades.ListMarketEvents = {}));
    })(Trades = CLOBAPI.Trades || (CLOBAPI.Trades = {}));
    /** Authenticated collateral or conditional-token balances and allowances. */
    let Balances;
    (function (Balances) {
        Balances.Query = zod_1.z.object({
            asset_type: CLOB.Common.AssetType,
            token_id: zod_1.z.string().optional(),
        });
        let GetAllowance;
        (function (GetAllowance) {
            GetAllowance.Request = Balances.Query;
            GetAllowance.Response = CLOB.BalanceAllowance.Schema;
        })(GetAllowance = Balances.GetAllowance || (Balances.GetAllowance = {}));
        let UpdateAllowance;
        (function (UpdateAllowance) {
            UpdateAllowance.Request = Balances.Query;
            UpdateAllowance.Response = zod_1.z.void();
        })(UpdateAllowance = Balances.UpdateAllowance || (Balances.UpdateAllowance = {}));
    })(Balances = CLOBAPI.Balances || (CLOBAPI.Balances = {}));
    /** Authenticated account notifications. */
    let Notifications;
    (function (Notifications) {
        let List;
        (function (List) {
            List.Request = CLOB.Common.Empty;
            List.Response = zod_1.z.array(CLOB.Notification.Schema);
        })(List = Notifications.List || (Notifications.List = {}));
        let Delete;
        (function (Delete) {
            Delete.Request = zod_1.z.object({
                ids: zod_1.z.array(zod_1.z.string()).optional(),
            }).prefault({});
            Delete.Response = zod_1.z.void();
        })(Delete = Notifications.Delete || (Notifications.Delete = {}));
    })(Notifications = CLOBAPI.Notifications || (CLOBAPI.Notifications = {}));
    /** Reward configurations are public; user earnings require authentication. */
    let Rewards;
    (function (Rewards) {
        let ListDailyEarnings;
        (function (ListDailyEarnings) {
            ListDailyEarnings.Request = DateQuery;
            ListDailyEarnings.Response = zod_1.z.array(CLOB.Reward.UserEarning);
        })(ListDailyEarnings = Rewards.ListDailyEarnings || (Rewards.ListDailyEarnings = {}));
        let ListDailyTotals;
        (function (ListDailyTotals) {
            ListDailyTotals.Request = DateQuery;
            ListDailyTotals.Response = zod_1.z.array(CLOB.Reward.TotalUserEarning);
        })(ListDailyTotals = Rewards.ListDailyTotals || (Rewards.ListDailyTotals = {}));
        let ListUserMarkets;
        (function (ListUserMarkets) {
            ListUserMarkets.Request = DateQuery.extend({
                order_by: zod_1.z.string().optional(),
                position: zod_1.z.string().optional(),
                no_competition: zod_1.z.boolean().optional(),
            });
            ListUserMarkets.Response = zod_1.z.array(CLOB.Reward.UserMarketEarning);
        })(ListUserMarkets = Rewards.ListUserMarkets || (Rewards.ListUserMarkets = {}));
        let GetPercentages;
        (function (GetPercentages) {
            GetPercentages.Request = CLOB.Common.Empty;
            GetPercentages.Response = zod_1.z.record(zod_1.z.string(), zod_1.z.number());
        })(GetPercentages = Rewards.GetPercentages || (Rewards.GetPercentages = {}));
        let ListCurrent;
        (function (ListCurrent) {
            ListCurrent.Request = CLOB.Common.Empty;
            ListCurrent.Response = zod_1.z.array(CLOB.Reward.Market);
        })(ListCurrent = Rewards.ListCurrent || (Rewards.ListCurrent = {}));
        let GetMarket;
        (function (GetMarket) {
            GetMarket.Request = ConditionId;
            GetMarket.Response = zod_1.z.array(CLOB.Reward.Market);
        })(GetMarket = Rewards.GetMarket || (Rewards.GetMarket = {}));
    })(Rewards = CLOBAPI.Rewards || (CLOBAPI.Rewards = {}));
    /** Public builder-attributed trades. */
    let Builders;
    (function (Builders) {
        let ListTrades;
        (function (ListTrades) {
            ListTrades.Request = CLOBAPI.Trades.Query.omit({
                only_first_page: true,
            }).extend({
                builder_code: zod_1.z.string(),
            });
            ListTrades.Response = CLOB.Builder.Trades;
        })(ListTrades = Builders.ListTrades || (Builders.ListTrades = {}));
    })(Builders = CLOBAPI.Builders || (CLOBAPI.Builders = {}));
})(CLOBAPI || (exports.CLOBAPI = CLOBAPI = {}));
