"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Accounting = exports.Builder = exports.Leaderboard = exports.Market = exports.User = exports.Holder = exports.Activity = exports.Trade = exports.Position = exports.Combo = exports.Status = exports.Common = void 0;
const zod_1 = require("zod");
var Common;
(function (Common) {
    Common.WalletAddress = zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/);
    Common.ConditionId = zod_1.z
        .string()
        .trim()
        .regex(/^0x[a-fA-F0-9]{64}$/)
        .brand("PolymarketConditionId");
    Common.ConditionIdOrEmpty = zod_1.z.union([
        Common.ConditionId,
        zod_1.z.literal(""),
    ]);
    // Coerced: node fields and tool arguments both arrive as strings, and Number() ignores
    // surrounding whitespace — so "  12  " lands as 12 and "abc" fails the int check here
    // rather than in each caller.
    Common.EventId = zod_1.z.coerce.number().int().min(1);
    Common.Side = zod_1.z.enum(["BUY", "SELL"]);
    Common.SideOrEmpty = zod_1.z.union([Common.Side, zod_1.z.literal("")]);
    Common.SortDirection = zod_1.z.enum(["ASC", "DESC"]);
    Common.TimePeriod = zod_1.z.enum(["DAY", "WEEK", "MONTH", "ALL"]);
    Common.Pagination = zod_1.z
        .object({
        limit: zod_1.z.number().int().nullish(),
        offset: zod_1.z.number().int().nullish(),
        has_more: zod_1.z.boolean().nullish(),
        next_cursor: zod_1.z.string().nullish(),
    })
        .loose();
})(Common || (exports.Common = Common = {}));
/**
 * The Data API evolves independently of PretzelGraph. Entity schemas preserve
 * unknown response fields while describing the documented public surface.
 */
var Status;
(function (Status) {
    Status.Schema = zod_1.z
        .object({
        data: zod_1.z.string().nullish(),
    })
        .loose();
})(Status || (exports.Status = Status = {}));
var Combo;
(function (Combo) {
    Combo.ConditionId = zod_1.z
        .string()
        .trim()
        .regex(/^0x[a-fA-F0-9]{62}$/)
        .brand("PolymarketComboConditionId");
    Combo.LegStatus = zod_1.z.enum([
        "OPEN",
        "RESOLVED_PARTIAL",
        "RESOLVED_WIN",
        "RESOLVED_LOSS",
    ]);
    Combo.Event = zod_1.z
        .object({
        event_id: zod_1.z.string().nullish(),
        event_slug: zod_1.z.string().nullish(),
        event_title: zod_1.z.string().nullish(),
        event_image: zod_1.z.string().nullish(),
    })
        .loose();
    Combo.Market = zod_1.z
        .object({
        market_id: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        title: zod_1.z.string().nullish(),
        outcome: zod_1.z.string().nullish(),
        image_url: zod_1.z.string().nullish(),
        icon_url: zod_1.z.string().nullish(),
        category: zod_1.z.string().nullish(),
        subcategory: zod_1.z.string().nullish(),
        tags: zod_1.z.array(zod_1.z.string()).nullish(),
        end_date: zod_1.z.string().nullish(),
        event: Combo.Event.nullish(),
    })
        .loose();
    Combo.Leg = zod_1.z
        .object({
        leg_index: zod_1.z.number().int().nullish(),
        leg_position_id: zod_1.z.string().nullish(),
        leg_condition_id: zod_1.z.string().nullish(),
        leg_outcome_index: zod_1.z.number().int().nullish(),
        leg_outcome_label: zod_1.z.string().nullish(),
        leg_status: Combo.LegStatus.nullish(),
        leg_resolved_at: zod_1.z.string().nullish(),
        leg_current_price: zod_1.z.string().nullish(),
        market: Combo.Market.nullish(),
    })
        .loose();
})(Combo || (exports.Combo = Combo = {}));
const ComboConditionId = Combo.ConditionId;
const ComboLeg = Combo.Leg;
var Position;
(function (Position) {
    Position.Schema = zod_1.z
        .object({
        proxyWallet: Common.WalletAddress.nullish(),
        asset: zod_1.z.string().nullish(),
        conditionId: Common.ConditionId.nullish(),
        size: zod_1.z.number().nullish(),
        avgPrice: zod_1.z.number().nullish(),
        initialValue: zod_1.z.number().nullish(),
        currentValue: zod_1.z.number().nullish(),
        cashPnl: zod_1.z.number().nullish(),
        percentPnl: zod_1.z.number().nullish(),
        totalBought: zod_1.z.number().nullish(),
        realizedPnl: zod_1.z.number().nullish(),
        percentRealizedPnl: zod_1.z.number().nullish(),
        curPrice: zod_1.z.number().nullish(),
        redeemable: zod_1.z.boolean().nullish(),
        mergeable: zod_1.z.boolean().nullish(),
        title: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        eventSlug: zod_1.z.string().nullish(),
        outcome: zod_1.z.string().nullish(),
        outcomeIndex: zod_1.z.number().int().nullish(),
        oppositeOutcome: zod_1.z.string().nullish(),
        oppositeAsset: zod_1.z.string().nullish(),
        endDate: zod_1.z.string().nullish(),
        negativeRisk: zod_1.z.boolean().nullish(),
    })
        .loose();
    Position.Closed = zod_1.z
        .object({
        proxyWallet: Common.WalletAddress.nullish(),
        asset: zod_1.z.string().nullish(),
        conditionId: Common.ConditionId.nullish(),
        avgPrice: zod_1.z.number().nullish(),
        totalBought: zod_1.z.number().nullish(),
        realizedPnl: zod_1.z.number().nullish(),
        curPrice: zod_1.z.number().nullish(),
        timestamp: zod_1.z.number().int().nullish(),
        title: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        eventSlug: zod_1.z.string().nullish(),
        outcome: zod_1.z.string().nullish(),
        outcomeIndex: zod_1.z.number().int().nullish(),
        oppositeOutcome: zod_1.z.string().nullish(),
        oppositeAsset: zod_1.z.string().nullish(),
        endDate: zod_1.z.string().nullish(),
    })
        .loose();
    Position.Market = zod_1.z
        .object({
        proxyWallet: Common.WalletAddress.nullish(),
        name: zod_1.z.string().nullish(),
        profileImage: zod_1.z.string().nullish(),
        verified: zod_1.z.boolean().nullish(),
        asset: zod_1.z.string().nullish(),
        conditionId: Common.ConditionId.nullish(),
        avgPrice: zod_1.z.number().nullish(),
        size: zod_1.z.number().nullish(),
        currPrice: zod_1.z.number().nullish(),
        currentValue: zod_1.z.number().nullish(),
        cashPnl: zod_1.z.number().nullish(),
        totalBought: zod_1.z.number().nullish(),
        realizedPnl: zod_1.z.number().nullish(),
        totalPnl: zod_1.z.number().nullish(),
        outcome: zod_1.z.string().nullish(),
        outcomeIndex: zod_1.z.number().int().nullish(),
    })
        .loose();
    Position.MarketGroup = zod_1.z
        .object({
        token: zod_1.z.string().nullish(),
        positions: zod_1.z.array(Position.Market).nullish(),
    })
        .loose();
    Position.ComboStatus = zod_1.z.enum([
        "OPEN",
        "PARTIAL",
        "RESOLVED_PARTIAL",
        "RESOLVED_WIN",
        "RESOLVED_LOSS",
    ]);
    Position.Combo = zod_1.z
        .object({
        combo_condition_id: ComboConditionId.nullish(),
        combo_position_id: zod_1.z.string().nullish(),
        module_id: zod_1.z.number().int().nullish(),
        user_address: Common.WalletAddress.nullish(),
        shares_balance: zod_1.z.string().nullish(),
        entry_avg_price_usdc: zod_1.z.string().nullish(),
        entry_cost_usdc: zod_1.z.string().nullish(),
        realized_payout_usdc: zod_1.z.string().nullish(),
        total_cost_usdc: zod_1.z.string().nullish(),
        gross_entry_cost_usdc: zod_1.z.string().nullish(),
        entry_fees_usdc: zod_1.z.string().nullish(),
        status: Position.ComboStatus.nullish(),
        first_entry_at: zod_1.z.string().nullish(),
        resolved_at: zod_1.z.string().nullish(),
        updated_at: zod_1.z.string().nullish(),
        legs_total: zod_1.z.number().int().nullish(),
        legs_resolved: zod_1.z.number().int().nullish(),
        legs_pending: zod_1.z.number().int().nullish(),
        legs: zod_1.z.array(ComboLeg).nullish(),
    })
        .loose();
    Position.ComboPage = zod_1.z
        .object({
        combos: zod_1.z.array(Position.Combo),
        pagination: Common.Pagination,
    })
        .loose();
})(Position || (exports.Position = Position = {}));
var Trade;
(function (Trade) {
    Trade.Schema = zod_1.z
        .object({
        proxyWallet: Common.WalletAddress.nullish(),
        side: Common.Side.nullish(),
        asset: zod_1.z.string().nullish(),
        conditionId: Common.ConditionId.nullish(),
        size: zod_1.z.number().nullish(),
        price: zod_1.z.number().nullish(),
        timestamp: zod_1.z.number().int().nullish(),
        title: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        eventSlug: zod_1.z.string().nullish(),
        outcome: zod_1.z.string().nullish(),
        outcomeIndex: zod_1.z.number().int().nullish(),
        name: zod_1.z.string().nullish(),
        pseudonym: zod_1.z.string().nullish(),
        bio: zod_1.z.string().nullish(),
        profileImage: zod_1.z.string().nullish(),
        profileImageOptimized: zod_1.z.string().nullish(),
        transactionHash: zod_1.z.string().nullish(),
    })
        .loose();
})(Trade || (exports.Trade = Trade = {}));
var Activity;
(function (Activity) {
    Activity.Type = zod_1.z.enum([
        "TRADE",
        "SPLIT",
        "MERGE",
        "REDEEM",
        "REWARD",
        "CONVERSION",
        "DEPOSIT",
        "WITHDRAWAL",
        "YIELD",
        "MAKER_REBATE",
        "TAKER_REBATE",
        "REFERRAL_REWARD",
    ]);
    Activity.Schema = zod_1.z
        .object({
        proxyWallet: Common.WalletAddress.nullish(),
        timestamp: zod_1.z.number().int().nullish(),
        conditionId: Common.ConditionIdOrEmpty.nullish(),
        type: Activity.Type.nullish(),
        size: zod_1.z.number().nullish(),
        usdcSize: zod_1.z.number().nullish(),
        transactionHash: zod_1.z.string().nullish(),
        price: zod_1.z.number().nullish(),
        asset: zod_1.z.string().nullish(),
        side: Common.SideOrEmpty.nullish(),
        outcomeIndex: zod_1.z.number().int().nullish(),
        title: zod_1.z.string().nullish(),
        slug: zod_1.z.string().nullish(),
        icon: zod_1.z.string().nullish(),
        eventSlug: zod_1.z.string().nullish(),
        outcome: zod_1.z.string().nullish(),
        name: zod_1.z.string().nullish(),
        pseudonym: zod_1.z.string().nullish(),
        bio: zod_1.z.string().nullish(),
        profileImage: zod_1.z.string().nullish(),
        profileImageOptimized: zod_1.z.string().nullish(),
        isCombo: zod_1.z.boolean().nullish(),
    })
        .loose();
    Activity.ComboType = zod_1.z.enum([
        "Split",
        "Merge",
        "Convert",
        "Compress",
        "Wrap",
        "Unwrap",
        "Redeem",
    ]);
    Activity.Combo = zod_1.z
        .object({
        id: zod_1.z.string().nullish(),
        type: Activity.ComboType.nullish(),
        event_kind: zod_1.z.string().nullish(),
        side: Activity.ComboType.nullish(),
        module_kind: zod_1.z.string().nullish(),
        user_address: Common.WalletAddress.nullish(),
        combo_condition_id: ComboConditionId.nullish(),
        combo_position_id: zod_1.z.string().nullish(),
        module_id: zod_1.z.number().int().nullish(),
        amount_usdc: zod_1.z.number().nullish(),
        payout_usdc: zod_1.z.number().nullish(),
        timestamp: zod_1.z.number().int().nullish(),
        tx_dttm: zod_1.z.string().nullish(),
        tx_hash: zod_1.z.string().nullish(),
        log_index: zod_1.z.number().int().nullish(),
        block_number: zod_1.z.number().int().nullish(),
        legs: zod_1.z.array(ComboLeg).nullish(),
    })
        .loose();
    Activity.ComboPage = zod_1.z
        .object({
        activity: zod_1.z.array(Activity.Combo),
        pagination: Common.Pagination,
    })
        .loose();
})(Activity || (exports.Activity = Activity = {}));
var Holder;
(function (Holder) {
    Holder.Schema = zod_1.z
        .object({
        proxyWallet: Common.WalletAddress.nullish(),
        bio: zod_1.z.string().nullish(),
        asset: zod_1.z.string().nullish(),
        pseudonym: zod_1.z.string().nullish(),
        amount: zod_1.z.number().nullish(),
        displayUsernamePublic: zod_1.z.boolean().nullish(),
        outcomeIndex: zod_1.z.number().int().nullish(),
        name: zod_1.z.string().nullish(),
        profileImage: zod_1.z.string().nullish(),
        profileImageOptimized: zod_1.z.string().nullish(),
    })
        .loose();
    Holder.Market = zod_1.z
        .object({
        token: zod_1.z.string().nullish(),
        holders: zod_1.z.array(Holder.Schema).nullish(),
    })
        .loose();
})(Holder || (exports.Holder = Holder = {}));
var User;
(function (User) {
    User.Traded = zod_1.z
        .object({
        user: Common.WalletAddress.nullish(),
        traded: zod_1.z.number().int().nullish(),
    })
        .loose();
    User.Value = zod_1.z
        .object({
        user: Common.WalletAddress.nullish(),
        value: zod_1.z.number().nullish(),
    })
        .loose();
})(User || (exports.User = User = {}));
var Market;
(function (Market) {
    Market.Identifier = zod_1.z.union([
        Common.ConditionIdOrEmpty,
        zod_1.z.literal("GLOBAL"),
    ]);
    Market.OpenInterest = zod_1.z
        .object({
        market: Market.Identifier.nullish(),
        value: zod_1.z.number().nullish(),
    })
        .loose();
    Market.Volume = zod_1.z
        .object({
        market: Market.Identifier.nullish(),
        value: zod_1.z.number().nullish(),
    })
        .loose();
    Market.LiveVolume = zod_1.z
        .object({
        total: zod_1.z.number().nullish(),
        markets: zod_1.z.array(Market.Volume).nullish(),
    })
        .loose();
})(Market || (exports.Market = Market = {}));
var Leaderboard;
(function (Leaderboard) {
    Leaderboard.Category = zod_1.z.enum([
        "OVERALL",
        "POLITICS",
        "SPORTS",
        "ESPORTS",
        "CRYPTO",
        "CULTURE",
        "MENTIONS",
        "WEATHER",
        "ECONOMICS",
        "TECH",
        "FINANCE",
    ]);
    Leaderboard.OrderBy = zod_1.z.enum(["PNL", "VOL"]);
    Leaderboard.Trader = zod_1.z
        .object({
        rank: zod_1.z.string().nullish(),
        proxyWallet: Common.WalletAddress.nullish(),
        userName: zod_1.z.string().nullish(),
        vol: zod_1.z.number().nullish(),
        pnl: zod_1.z.number().nullish(),
        profileImage: zod_1.z.string().nullish(),
        xUsername: zod_1.z.string().nullish(),
        verifiedBadge: zod_1.z.boolean().nullish(),
    })
        .loose();
})(Leaderboard || (exports.Leaderboard = Leaderboard = {}));
var Builder;
(function (Builder) {
    Builder.LeaderboardEntry = zod_1.z
        .object({
        rank: zod_1.z.string().nullish(),
        builder: zod_1.z.string().nullish(),
        builderCode: zod_1.z.string().nullish(),
        volume: zod_1.z.number().nullish(),
        activeUsers: zod_1.z.number().int().nullish(),
        verified: zod_1.z.boolean().nullish(),
        builderLogo: zod_1.z.string().nullish(),
    })
        .loose();
    Builder.VolumeEntry = zod_1.z
        .object({
        dt: zod_1.z.string().nullish(),
        builder: zod_1.z.string().nullish(),
        builderCode: zod_1.z.string().nullish(),
        builderLogo: zod_1.z.string().nullish(),
        verified: zod_1.z.boolean().nullish(),
        volume: zod_1.z.number().nullish(),
        activeUsers: zod_1.z.number().int().nullish(),
        rank: zod_1.z.string().nullish(),
    })
        .loose();
})(Builder || (exports.Builder = Builder = {}));
var Accounting;
(function (Accounting) {
    Accounting.Snapshot = zod_1.z.union([
        zod_1.z.instanceof(ArrayBuffer),
        zod_1.z.instanceof(Uint8Array),
    ]);
})(Accounting || (exports.Accounting = Accounting = {}));
