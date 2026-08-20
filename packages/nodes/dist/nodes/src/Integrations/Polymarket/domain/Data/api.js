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
exports.DataAPI = void 0;
const zod_1 = require("zod");
const Data = __importStar(require("./schemas"));
var DataAPI;
(function (DataAPI) {
    function withMarketOrEventFilter(shape) {
        return zod_1.z.union([
            zod_1.z.object({
                ...shape,
                market: zod_1.z.array(Data.Common.ConditionId),
                eventId: zod_1.z.never().optional(),
            }),
            zod_1.z.object({
                ...shape,
                market: zod_1.z.never().optional(),
                eventId: zod_1.z.array(Data.Common.EventId),
            }),
            zod_1.z.object({
                ...shape,
                market: zod_1.z.never().optional(),
                eventId: zod_1.z.never().optional(),
            }),
        ]);
    }
    let Status;
    (function (Status) {
        let Get;
        (function (Get) {
            Get.Request = zod_1.z.object({}).prefault({});
            Get.Response = Data.Status.Schema;
        })(Get = Status.Get || (Status.Get = {}));
    })(Status = DataAPI.Status || (DataAPI.Status = {}));
    let Positions;
    (function (Positions) {
        let ListCurrent;
        (function (ListCurrent) {
            ListCurrent.Request = withMarketOrEventFilter({
                user: Data.Common.WalletAddress,
                sizeThreshold: zod_1.z.number().min(0).default(1),
                redeemable: zod_1.z.boolean().default(false),
                mergeable: zod_1.z.boolean().default(false),
                limit: zod_1.z.number().int().min(0).max(500).default(100),
                offset: zod_1.z.number().int().min(0).max(10_000).default(0),
                sortBy: zod_1.z
                    .enum([
                    "CURRENT",
                    "INITIAL",
                    "TOKENS",
                    "CASHPNL",
                    "PERCENTPNL",
                    "TITLE",
                    "RESOLVING",
                    "PRICE",
                    "AVGPRICE",
                ])
                    .default("TOKENS"),
                sortDirection: Data.Common.SortDirection.default("DESC"),
                title: zod_1.z.string().max(100).optional(),
            });
            ListCurrent.Response = zod_1.z.array(Data.Position.Schema);
        })(ListCurrent = Positions.ListCurrent || (Positions.ListCurrent = {}));
        let ListClosed;
        (function (ListClosed) {
            ListClosed.Request = withMarketOrEventFilter({
                user: Data.Common.WalletAddress,
                title: zod_1.z.string().max(100).optional(),
                limit: zod_1.z.number().int().min(0).max(50).default(10),
                offset: zod_1.z.number().int().min(0).max(100_000).default(0),
                sortBy: zod_1.z
                    .enum([
                    "REALIZEDPNL",
                    "TITLE",
                    "PRICE",
                    "AVGPRICE",
                    "TIMESTAMP",
                ])
                    .default("REALIZEDPNL"),
                sortDirection: Data.Common.SortDirection.default("DESC"),
            });
            ListClosed.Response = zod_1.z.array(Data.Position.Closed);
        })(ListClosed = Positions.ListClosed || (Positions.ListClosed = {}));
        let ListForMarket;
        (function (ListForMarket) {
            ListForMarket.Request = zod_1.z.object({
                market: Data.Common.ConditionId,
                user: Data.Common.WalletAddress.optional(),
                status: zod_1.z.enum(["OPEN", "CLOSED", "ALL"]).default("ALL"),
                sortBy: zod_1.z
                    .enum([
                    "TOKENS",
                    "CASH_PNL",
                    "REALIZED_PNL",
                    "TOTAL_PNL",
                ])
                    .default("TOTAL_PNL"),
                sortDirection: Data.Common.SortDirection.default("DESC"),
                limit: zod_1.z.number().int().min(0).max(500).default(50),
                offset: zod_1.z.number().int().min(0).max(10_000).default(0),
            });
            ListForMarket.Response = zod_1.z.array(Data.Position.MarketGroup);
        })(ListForMarket = Positions.ListForMarket || (Positions.ListForMarket = {}));
        let ListCombos;
        (function (ListCombos) {
            ListCombos.Request = zod_1.z.object({
                user: Data.Common.WalletAddress,
                status: zod_1.z.array(Data.Position.ComboStatus).optional(),
                sort: zod_1.z
                    .enum([
                    "current_value_desc",
                    "first_entry_desc",
                    "entry_cost_desc",
                    "resolved_at_desc",
                    "updated_asc",
                ])
                    .default("current_value_desc"),
                market_id: zod_1.z.array(Data.Combo.ConditionId).optional(),
                limit: zod_1.z.number().int().min(0).max(1_000).default(20),
                offset: zod_1.z.number().int().min(0).max(100_000).default(0),
                updatedAfter: zod_1.z.number().int().optional(),
                updatedBefore: zod_1.z.number().int().optional(),
                cursor: zod_1.z.string().optional(),
            });
            ListCombos.Response = Data.Position.ComboPage;
        })(ListCombos = Positions.ListCombos || (Positions.ListCombos = {}));
    })(Positions = DataAPI.Positions || (DataAPI.Positions = {}));
    let Trades;
    (function (Trades) {
        let List;
        (function (List) {
            List.Request = withMarketOrEventFilter({
                limit: zod_1.z.number().int().min(1).max(10_000).default(100),
                offset: zod_1.z.number().int().min(0).max(10_000).default(0),
                takerOnly: zod_1.z.boolean().default(true),
                filterType: zod_1.z.enum(["CASH", "TOKENS"]).optional(),
                filterAmount: zod_1.z.number().min(0).optional(),
                user: Data.Common.WalletAddress.optional(),
                side: Data.Common.Side.optional(),
                start: zod_1.z.number().int().min(0).optional(),
                end: zod_1.z.number().int().min(0).optional(),
            })
                .refine(({ filterType, filterAmount }) => (filterType === undefined) ===
                (filterAmount === undefined), {
                message: "filterType and filterAmount must be provided together",
            })
                .prefault({});
            List.Response = zod_1.z.array(Data.Trade.Schema);
        })(List = Trades.List || (Trades.List = {}));
    })(Trades = DataAPI.Trades || (DataAPI.Trades = {}));
    let Activity;
    (function (Activity) {
        let List;
        (function (List) {
            List.Request = withMarketOrEventFilter({
                limit: zod_1.z.number().int().min(0).max(500).default(100),
                offset: zod_1.z.number().int().min(0).max(5_000).default(0),
                user: Data.Common.WalletAddress,
                type: zod_1.z.array(Data.Activity.Type).optional(),
                start: zod_1.z.number().int().min(0).optional(),
                end: zod_1.z.number().int().min(0).optional(),
                sortBy: zod_1.z
                    .enum(["TIMESTAMP", "TOKENS", "CASH"])
                    .default("TIMESTAMP"),
                sortDirection: Data.Common.SortDirection.default("DESC"),
                side: Data.Common.Side.optional(),
            });
            List.Response = zod_1.z.array(Data.Activity.Schema);
        })(List = Activity.List || (Activity.List = {}));
        let ListCombos;
        (function (ListCombos) {
            ListCombos.Request = zod_1.z.object({
                user: Data.Common.WalletAddress,
                market_id: zod_1.z.array(Data.Combo.ConditionId).optional(),
                limit: zod_1.z.number().int().min(0).max(500).default(50),
                offset: zod_1.z.number().int().min(0).max(10_000).default(0),
                cursor: zod_1.z.string().optional(),
            });
            ListCombos.Response = Data.Activity.ComboPage;
        })(ListCombos = Activity.ListCombos || (Activity.ListCombos = {}));
    })(Activity = DataAPI.Activity || (DataAPI.Activity = {}));
    let Users;
    (function (Users) {
        let GetValue;
        (function (GetValue) {
            GetValue.Request = zod_1.z.object({
                user: Data.Common.WalletAddress,
                market: zod_1.z.array(Data.Common.ConditionId).optional(),
            });
            GetValue.Response = zod_1.z.array(Data.User.Value);
        })(GetValue = Users.GetValue || (Users.GetValue = {}));
        let GetTradedMarketCount;
        (function (GetTradedMarketCount) {
            GetTradedMarketCount.Request = zod_1.z.object({
                user: Data.Common.WalletAddress,
            });
            GetTradedMarketCount.Response = Data.User.Traded;
        })(GetTradedMarketCount = Users.GetTradedMarketCount || (Users.GetTradedMarketCount = {}));
    })(Users = DataAPI.Users || (DataAPI.Users = {}));
    let Markets;
    (function (Markets) {
        let ListHolders;
        (function (ListHolders) {
            ListHolders.Request = zod_1.z.object({
                market: zod_1.z.array(Data.Common.ConditionId),
                limit: zod_1.z.number().int().min(1).max(20).default(20),
                minBalance: zod_1.z
                    .number()
                    .int()
                    .min(0)
                    .max(999_999)
                    .default(1),
            });
            ListHolders.Response = zod_1.z.array(Data.Holder.Market);
        })(ListHolders = Markets.ListHolders || (Markets.ListHolders = {}));
        let GetOpenInterest;
        (function (GetOpenInterest) {
            GetOpenInterest.Request = zod_1.z
                .object({
                market: zod_1.z.array(Data.Common.ConditionId).optional(),
            })
                .prefault({});
            GetOpenInterest.Response = zod_1.z.array(Data.Market.OpenInterest);
        })(GetOpenInterest = Markets.GetOpenInterest || (Markets.GetOpenInterest = {}));
        let GetLiveVolume;
        (function (GetLiveVolume) {
            GetLiveVolume.Request = zod_1.z.object({
                id: Data.Common.EventId,
            });
            GetLiveVolume.Response = zod_1.z.array(Data.Market.LiveVolume);
        })(GetLiveVolume = Markets.GetLiveVolume || (Markets.GetLiveVolume = {}));
    })(Markets = DataAPI.Markets || (DataAPI.Markets = {}));
    let Leaderboard;
    (function (Leaderboard) {
        let List;
        (function (List) {
            List.Request = zod_1.z
                .object({
                category: Data.Leaderboard.Category.default("OVERALL"),
                timePeriod: Data.Common.TimePeriod.default("DAY"),
                orderBy: Data.Leaderboard.OrderBy.default("PNL"),
                limit: zod_1.z.number().int().min(1).max(50).default(25),
                offset: zod_1.z.number().int().min(0).max(1_000).default(0),
                user: Data.Common.WalletAddress.optional(),
                userName: zod_1.z.string().optional(),
            })
                .prefault({});
            List.Response = zod_1.z.array(Data.Leaderboard.Trader);
        })(List = Leaderboard.List || (Leaderboard.List = {}));
    })(Leaderboard = DataAPI.Leaderboard || (DataAPI.Leaderboard = {}));
    let Builders;
    (function (Builders) {
        let ListLeaderboard;
        (function (ListLeaderboard) {
            ListLeaderboard.Request = zod_1.z
                .object({
                timePeriod: Data.Common.TimePeriod.default("DAY"),
                limit: zod_1.z.number().int().min(0).max(50).default(25),
                offset: zod_1.z.number().int().min(0).max(1_000).default(0),
            })
                .prefault({});
            ListLeaderboard.Response = zod_1.z.array(Data.Builder.LeaderboardEntry);
        })(ListLeaderboard = Builders.ListLeaderboard || (Builders.ListLeaderboard = {}));
        let ListVolume;
        (function (ListVolume) {
            ListVolume.Request = zod_1.z
                .object({
                timePeriod: Data.Common.TimePeriod.default("DAY"),
            })
                .prefault({});
            ListVolume.Response = zod_1.z.array(Data.Builder.VolumeEntry);
        })(ListVolume = Builders.ListVolume || (Builders.ListVolume = {}));
    })(Builders = DataAPI.Builders || (DataAPI.Builders = {}));
    let Accounting;
    (function (Accounting) {
        let DownloadSnapshot;
        (function (DownloadSnapshot) {
            DownloadSnapshot.Request = zod_1.z.object({
                user: Data.Common.WalletAddress,
            });
            DownloadSnapshot.Response = Data.Accounting.Snapshot;
        })(DownloadSnapshot = Accounting.DownloadSnapshot || (Accounting.DownloadSnapshot = {}));
    })(Accounting = DataAPI.Accounting || (DataAPI.Accounting = {}));
})(DataAPI || (exports.DataAPI = DataAPI = {}));
