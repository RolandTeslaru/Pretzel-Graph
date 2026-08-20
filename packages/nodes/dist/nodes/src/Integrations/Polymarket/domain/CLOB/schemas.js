"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketTradeEvent = exports.Builder = exports.Notification = exports.BalanceAllowance = exports.Trade = exports.Order = exports.MarketData = exports.OrderBook = exports.Market = exports.Reward = exports.Token = exports.PriceLevel = exports.ApiCredentials = exports.Common = void 0;
const zod_1 = require("zod");
var Common;
(function (Common) {
    Common.Side = zod_1.z.enum(["BUY", "SELL"]);
    Common.SideOrEmpty = zod_1.z.union([Common.Side, zod_1.z.literal("")]);
    Common.OrderType = zod_1.z.enum(["GTC", "GTD", "FOK", "FAK"]);
    Common.AssetType = zod_1.z.enum(["COLLATERAL", "CONDITIONAL"]);
    Common.PriceHistoryInterval = zod_1.z.enum(["max", "1w", "1d", "6h", "1h"]);
    Common.TickSize = zod_1.z.enum(["0.1", "0.01", "0.005", "0.0025", "0.001", "0.0001"]);
    Common.OrderVersion = zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]);
    Common.SignatureType = zod_1.z.union([zod_1.z.literal(0), zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]);
    // The address CLOB sends as POLY_ADDRESS. On a proxy or Safe setup this is the signing EOA,
    // not the funding wallet.
    Common.WalletAddress = zod_1.z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed, 40-character hex wallet address");
    Common.Cursor = zod_1.z.object({
        next_cursor: zod_1.z.string().optional(),
    }).prefault({});
    Common.BookParams = zod_1.z.object({
        token_id: zod_1.z.string(),
        side: Common.Side,
    });
    Common.Empty = zod_1.z.object({}).loose().prefault({});
    function Paginated(item) {
        return zod_1.z.object({
            limit: zod_1.z.number(),
            count: zod_1.z.number(),
            next_cursor: zod_1.z.string(),
            data: zod_1.z.array(item),
        }).loose();
    }
    Common.Paginated = Paginated;
})(Common || (exports.Common = Common = {}));
var ApiCredentials;
(function (ApiCredentials) {
    ApiCredentials.Schema = zod_1.z.object({
        key: zod_1.z.string(),
        secret: zod_1.z.string(),
        passphrase: zod_1.z.string(),
    });
})(ApiCredentials || (exports.ApiCredentials = ApiCredentials = {}));
var PriceLevel;
(function (PriceLevel) {
    PriceLevel.Schema = zod_1.z.object({
        price: zod_1.z.string(),
        size: zod_1.z.string(),
    }).loose();
})(PriceLevel || (exports.PriceLevel = PriceLevel = {}));
var Token;
(function (Token) {
    Token.Schema = zod_1.z.object({
        token_id: zod_1.z.string(),
        outcome: zod_1.z.string(),
        price: zod_1.z.number(),
        winner: zod_1.z.boolean().optional(),
    }).loose();
})(Token || (exports.Token = Token = {}));
var Reward;
(function (Reward) {
    Reward.Rate = zod_1.z.object({
        asset_address: zod_1.z.string().nullish(),
        rewards_daily_rate: zod_1.z.number().nullish(),
    }).loose();
    Reward.Summary = zod_1.z.object({
        rates: zod_1.z.array(Reward.Rate).nullish(),
        min_size: zod_1.z.number(),
        max_spread: zod_1.z.number(),
    }).loose();
    Reward.Config = zod_1.z.object({
        asset_address: zod_1.z.string(),
        start_date: zod_1.z.string(),
        end_date: zod_1.z.string(),
        rate_per_day: zod_1.z.number(),
        total_rewards: zod_1.z.number(),
    }).loose();
    Reward.Market = zod_1.z.object({
        condition_id: zod_1.z.string(),
        question: zod_1.z.string(),
        market_slug: zod_1.z.string(),
        event_slug: zod_1.z.string(),
        image: zod_1.z.string(),
        rewards_max_spread: zod_1.z.number(),
        rewards_min_size: zod_1.z.number(),
        tokens: zod_1.z.array(Token.Schema),
        rewards_config: zod_1.z.array(Reward.Config),
    }).loose();
    Reward.Earning = zod_1.z.object({
        asset_address: zod_1.z.string(),
        earnings: zod_1.z.number(),
        asset_rate: zod_1.z.number(),
    }).loose();
    Reward.UserEarning = zod_1.z.object({
        date: zod_1.z.string(),
        condition_id: zod_1.z.string(),
        asset_address: zod_1.z.string(),
        maker_address: zod_1.z.string(),
        earnings: zod_1.z.number(),
        asset_rate: zod_1.z.number(),
    }).loose();
    Reward.TotalUserEarning = zod_1.z.object({
        date: zod_1.z.string(),
        asset_address: zod_1.z.string(),
        maker_address: zod_1.z.string(),
        earnings: zod_1.z.number(),
        asset_rate: zod_1.z.number(),
    }).loose();
    Reward.UserMarketEarning = Reward.Market.extend({
        market_competitiveness: zod_1.z.number(),
        maker_address: zod_1.z.string(),
        earning_percentage: zod_1.z.number(),
        earnings: zod_1.z.array(Reward.Earning),
    }).loose();
})(Reward || (exports.Reward = Reward = {}));
var Market;
(function (Market) {
    Market.Simplified = zod_1.z.object({
        condition_id: zod_1.z.string(),
        rewards: Reward.Summary,
        tokens: zod_1.z.array(Token.Schema),
        active: zod_1.z.boolean(),
        closed: zod_1.z.boolean(),
        archived: zod_1.z.boolean(),
        accepting_orders: zod_1.z.boolean(),
    }).loose();
    Market.Schema = Market.Simplified.extend({
        enable_order_book: zod_1.z.boolean(),
        accepting_order_timestamp: zod_1.z.string().nullish(),
        minimum_order_size: zod_1.z.number(),
        minimum_tick_size: zod_1.z.number(),
        question_id: zod_1.z.string(),
        question: zod_1.z.string(),
        description: zod_1.z.string(),
        market_slug: zod_1.z.string(),
        end_date_iso: zod_1.z.string().nullish(),
        game_start_time: zod_1.z.string().nullish(),
        seconds_delay: zod_1.z.number(),
        fpmm: zod_1.z.string(),
        maker_base_fee: zod_1.z.number(),
        taker_base_fee: zod_1.z.number(),
        notifications_enabled: zod_1.z.boolean(),
        neg_risk: zod_1.z.boolean(),
        neg_risk_market_id: zod_1.z.string(),
        neg_risk_request_id: zod_1.z.string(),
        icon: zod_1.z.string(),
        image: zod_1.z.string(),
        is_50_50_outcome: zod_1.z.boolean(),
        tags: zod_1.z.array(zod_1.z.string()).nullish(),
    }).loose();
    Market.FeeDetails = zod_1.z.object({
        r: zod_1.z.number().optional(),
        e: zod_1.z.number().optional(),
        to: zod_1.z.boolean().optional(),
    }).loose();
    Market.ClobRewards = zod_1.z.object({
        mi: zod_1.z.number().optional(),
        ma: zod_1.z.number().optional(),
        e: zod_1.z.boolean().optional(),
        smoa: zod_1.z.boolean().optional(),
        moas: zod_1.z.number().optional(),
    }).loose();
    Market.ClobToken = zod_1.z.object({
        t: zod_1.z.string(),
        o: zod_1.z.string(),
    }).loose();
    // The SDK's market endpoint answers in single-letter keys. Names were confirmed by comparing
    // values against the REST /markets/{condition_id} response for the same market — mts/mos/mbf/
    // tbf/ao/aot and the rewards pair all matched exactly. The handful whose meaning isn't
    // established (rfqe, itode, ibce, and the rewards extras) pass through under their own keys
    // rather than being given invented names.
    const ClobInfoWire = zod_1.z.object({
        c: zod_1.z.string(),
        t: zod_1.z.tuple([Market.ClobToken, Market.ClobToken]),
        mts: zod_1.z.number(),
        nr: zod_1.z.boolean().optional(),
        fd: Market.FeeDetails.optional(),
        mbf: zod_1.z.number().optional(),
        tbf: zod_1.z.number().optional(),
        r: Market.ClobRewards.nullish(),
        ao: zod_1.z.boolean().optional(),
        mos: zod_1.z.number().optional(),
        sd: zod_1.z.number().optional(),
        gst: zod_1.z.string().optional(),
        cbos: zod_1.z.boolean().optional(),
        aot: zod_1.z.string().optional(),
        rfqe: zod_1.z.boolean().optional(),
        itode: zod_1.z.boolean().optional(),
        ibce: zod_1.z.boolean().optional(),
    }).loose();
    Market.ClobInfo = ClobInfoWire.transform(wire => {
        const { c, t, mts, nr, fd, mbf, tbf, r, ao, mos, sd, gst, cbos, aot, ...rest } = wire;
        return {
            conditionId: c,
            tokens: t.map(token => ({ tokenId: token.t, outcome: token.o })),
            minimumTickSize: mts,
            minimumOrderSize: mos,
            negRisk: nr,
            acceptingOrders: ao,
            acceptingOrdersSince: aot,
            clearBookOnStart: cbos,
            secondsDelay: sd,
            gameStartTime: gst,
            makerBaseFee: mbf,
            takerBaseFee: tbf,
            fees: fd && { rate: fd.r, exponent: fd.e, takerOnly: fd.to },
            rewards: r && { minSize: r.mi, maxSpread: r.ma, enabled: r.e },
            ...rest,
        };
    });
})(Market || (exports.Market = Market = {}));
var OrderBook;
(function (OrderBook) {
    OrderBook.Schema = zod_1.z.object({
        market: zod_1.z.string(),
        asset_id: zod_1.z.string(),
        timestamp: zod_1.z.string(),
        hash: zod_1.z.string(),
        bids: zod_1.z.array(PriceLevel.Schema),
        asks: zod_1.z.array(PriceLevel.Schema),
        min_order_size: zod_1.z.string(),
        tick_size: zod_1.z.string(),
        neg_risk: zod_1.z.boolean(),
        last_trade_price: zod_1.z.string().nullish(),
    }).loose();
})(OrderBook || (exports.OrderBook = OrderBook = {}));
var MarketData;
(function (MarketData) {
    MarketData.Midpoint = zod_1.z.object({
        mid: zod_1.z.string(),
    }).loose();
    MarketData.Price = zod_1.z.object({
        price: zod_1.z.string(),
    }).loose();
    MarketData.Spread = zod_1.z.object({
        spread: zod_1.z.string(),
    }).loose();
    MarketData.LastTradePrice = zod_1.z.object({
        price: zod_1.z.string(),
        side: Common.SideOrEmpty.nullish(),
    }).loose();
    MarketData.BatchValue = zod_1.z.object({
        token_id: zod_1.z.string(),
        side: Common.Side.nullish(),
        price: zod_1.z.string().nullish(),
        mid: zod_1.z.string().nullish(),
        spread: zod_1.z.string().nullish(),
    }).loose();
    MarketData.PricePoint = zod_1.z.object({
        t: zod_1.z.number(),
        p: zod_1.z.number(),
    }).loose();
})(MarketData || (exports.MarketData = MarketData = {}));
var Order;
(function (Order) {
    Order.Limit = zod_1.z.object({
        tokenID: zod_1.z.string(),
        price: zod_1.z.number(),
        size: zod_1.z.number(),
        side: Common.Side,
        metadata: zod_1.z.string().optional(),
        builderCode: zod_1.z.string().optional(),
        expiration: zod_1.z.number().int().nonnegative().optional(),
        userUSDCBalance: zod_1.z.number().nonnegative().optional(),
        feeRateBps: zod_1.z.number().int().nonnegative().optional(),
        nonce: zod_1.z.number().int().nonnegative().optional(),
        taker: zod_1.z.string().optional(),
    });
    Order.Market = zod_1.z.object({
        tokenID: zod_1.z.string(),
        price: zod_1.z.number().optional(),
        amount: zod_1.z.number().positive(),
        side: Common.Side,
        orderType: zod_1.z.enum(["FOK", "FAK"]).optional(),
        userUSDCBalance: zod_1.z.number().nonnegative().optional(),
        metadata: zod_1.z.string().optional(),
        builderCode: zod_1.z.string().optional(),
        feeRateBps: zod_1.z.number().int().nonnegative().optional(),
        nonce: zod_1.z.number().int().nonnegative().optional(),
        taker: zod_1.z.string().optional(),
    });
    Order.CreateOptions = zod_1.z.object({
        tickSize: Common.TickSize.optional(),
        negRisk: zod_1.z.boolean().optional(),
        version: Common.OrderVersion.optional(),
    });
    Order.ExchangeV3Amounts = zod_1.z.object({
        tokenID: zod_1.z.string(),
        makerAmount: zod_1.z.string(),
        takerAmount: zod_1.z.string(),
        side: Common.Side,
        metadata: zod_1.z.string().optional(),
        builderCode: zod_1.z.string().optional(),
        expiration: zod_1.z.number().int().nonnegative().optional(),
    });
    Order.Signed = zod_1.z.object({
        salt: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.bigint()]),
        maker: zod_1.z.string(),
        signer: zod_1.z.string(),
        taker: zod_1.z.string(),
        tokenId: zod_1.z.string(),
        makerAmount: zod_1.z.string(),
        takerAmount: zod_1.z.string(),
        side: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
        signatureType: Common.SignatureType,
        signature: zod_1.z.string(),
        expiration: zod_1.z.string().nullish(),
        nonce: zod_1.z.string().nullish(),
        feeRateBps: zod_1.z.string().nullish(),
        timestamp: zod_1.z.string().nullish(),
        metadata: zod_1.z.string().nullish(),
        builder: zod_1.z.string().nullish(),
    }).loose();
    Order.Response = zod_1.z.object({
        success: zod_1.z.boolean(),
        errorMsg: zod_1.z.string(),
        orderID: zod_1.z.string(),
        transactionsHashes: zod_1.z.array(zod_1.z.string()).optional(),
        tradeIDs: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.string(),
        takingAmount: zod_1.z.string(),
        makingAmount: zod_1.z.string(),
    }).loose();
    Order.CancelResponse = zod_1.z.object({
        canceled: zod_1.z.array(zod_1.z.string()),
        not_canceled: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    }).loose();
    Order.Open = zod_1.z.object({
        id: zod_1.z.string(),
        status: zod_1.z.string(),
        owner: zod_1.z.string(),
        maker_address: zod_1.z.string(),
        market: zod_1.z.string(),
        asset_id: zod_1.z.string(),
        side: zod_1.z.string(),
        original_size: zod_1.z.string(),
        size_matched: zod_1.z.string(),
        price: zod_1.z.string(),
        associate_trades: zod_1.z.array(zod_1.z.string()),
        outcome: zod_1.z.string(),
        created_at: zod_1.z.number(),
        expiration: zod_1.z.string(),
        order_type: zod_1.z.string(),
    }).loose();
})(Order || (exports.Order = Order = {}));
var Trade;
(function (Trade) {
    Trade.MakerOrder = zod_1.z.object({
        order_id: zod_1.z.string(),
        owner: zod_1.z.string(),
        maker_address: zod_1.z.string(),
        matched_amount: zod_1.z.string(),
        price: zod_1.z.string(),
        fee_rate_bps: zod_1.z.string(),
        asset_id: zod_1.z.string(),
        outcome: zod_1.z.string(),
        side: Common.Side.optional(),
        builder_fee: zod_1.z.string().optional(),
        builder_code: zod_1.z.string().optional(),
    }).loose();
    Trade.Schema = zod_1.z.object({
        id: zod_1.z.string(),
        taker_order_id: zod_1.z.string(),
        market: zod_1.z.string(),
        asset_id: zod_1.z.string(),
        side: Common.Side,
        size: zod_1.z.string(),
        fee_rate_bps: zod_1.z.string(),
        price: zod_1.z.string(),
        status: zod_1.z.string(),
        match_time: zod_1.z.string(),
        match_time_nano: zod_1.z.string().optional(),
        last_update: zod_1.z.string(),
        outcome: zod_1.z.string(),
        bucket_index: zod_1.z.number(),
        owner: zod_1.z.string(),
        maker_address: zod_1.z.string(),
        maker_orders: zod_1.z.array(Trade.MakerOrder),
        transaction_hash: zod_1.z.string().optional(),
        err_msg: zod_1.z.string().nullish(),
        trader_side: zod_1.z.enum(["TAKER", "MAKER"]),
    }).loose();
    Trade.Paginated = zod_1.z.object({
        trades: zod_1.z.array(Trade.Schema),
        next_cursor: zod_1.z.string(),
        limit: zod_1.z.number(),
        count: zod_1.z.number(),
    }).loose();
})(Trade || (exports.Trade = Trade = {}));
var BalanceAllowance;
(function (BalanceAllowance) {
    BalanceAllowance.Schema = zod_1.z.object({
        balance: zod_1.z.string(),
        allowances: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    }).loose();
})(BalanceAllowance || (exports.BalanceAllowance = BalanceAllowance = {}));
var Notification;
(function (Notification) {
    Notification.Schema = zod_1.z.object({
        type: zod_1.z.number(),
        owner: zod_1.z.string(),
        payload: zod_1.z.unknown(),
    }).loose();
})(Notification || (exports.Notification = Notification = {}));
var Builder;
(function (Builder) {
    Builder.Trade = zod_1.z.object({
        id: zod_1.z.string(),
        tradeType: zod_1.z.string(),
        takerOrderHash: zod_1.z.string(),
        builder: zod_1.z.string(),
        market: zod_1.z.string(),
        assetId: zod_1.z.string(),
        side: zod_1.z.string(),
        size: zod_1.z.string(),
        sizeUsdc: zod_1.z.string(),
        price: zod_1.z.string(),
        status: zod_1.z.string(),
        outcome: zod_1.z.string(),
        outcomeIndex: zod_1.z.number(),
        owner: zod_1.z.string(),
        maker: zod_1.z.string(),
        transactionHash: zod_1.z.string(),
        matchTime: zod_1.z.string(),
        bucketIndex: zod_1.z.number(),
        fee: zod_1.z.string(),
        feeUsdc: zod_1.z.string(),
        builderFee: zod_1.z.string(),
        builderCode: zod_1.z.string(),
        err_msg: zod_1.z.string().nullish(),
        createdAt: zod_1.z.string().nullish(),
        updatedAt: zod_1.z.string().nullish(),
    }).loose();
    Builder.Trades = zod_1.z.object({
        trades: zod_1.z.array(Builder.Trade),
        next_cursor: zod_1.z.string(),
        limit: zod_1.z.number(),
        count: zod_1.z.number(),
    }).loose();
})(Builder || (exports.Builder = Builder = {}));
var MarketTradeEvent;
(function (MarketTradeEvent) {
    MarketTradeEvent.Schema = zod_1.z.object({
        event_type: zod_1.z.string(),
        market: zod_1.z.object({
            condition_id: zod_1.z.string(),
            asset_id: zod_1.z.string(),
            question: zod_1.z.string(),
            icon: zod_1.z.string(),
            slug: zod_1.z.string(),
        }).loose(),
        user: zod_1.z.object({
            address: zod_1.z.string(),
            username: zod_1.z.string(),
            profile_picture: zod_1.z.string(),
            optimized_profile_picture: zod_1.z.string(),
            pseudonym: zod_1.z.string(),
        }).loose(),
        side: Common.Side,
        size: zod_1.z.string(),
        fee_rate_bps: zod_1.z.string(),
        price: zod_1.z.string(),
        outcome: zod_1.z.string(),
        outcome_index: zod_1.z.number(),
        transaction_hash: zod_1.z.string(),
        timestamp: zod_1.z.string(),
    }).loose();
})(MarketTradeEvent || (exports.MarketTradeEvent = MarketTradeEvent = {}));
