import { z } from "zod"

export namespace Common {
    export const Side                 = z.enum(["BUY", "SELL"])
    export const SideOrEmpty          = z.union([Side, z.literal("")])
    export const OrderType            = z.enum(["GTC", "GTD", "FOK", "FAK"])
    export const AssetType            = z.enum(["COLLATERAL", "CONDITIONAL"])
    export const PriceHistoryInterval = z.enum(["max", "1w", "1d", "6h", "1h"])
    export const TickSize             = z.enum(["0.1", "0.01", "0.005", "0.0025", "0.001", "0.0001"])
    export const OrderVersion         = z.union([z.literal(1), z.literal(2), z.literal(3)])
    export const SignatureType        = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])

    export type Side                 = z.infer<typeof Side>
    export type SideOrEmpty          = z.infer<typeof SideOrEmpty>
    export type OrderType            = z.infer<typeof OrderType>
    export type AssetType            = z.infer<typeof AssetType>
    export type PriceHistoryInterval = z.infer<typeof PriceHistoryInterval>
    export type TickSize             = z.infer<typeof TickSize>
    export type OrderVersion         = z.infer<typeof OrderVersion>
    export type SignatureType        = z.infer<typeof SignatureType>

    export const Cursor = z.object({
        next_cursor: z.string().optional(),
    }).prefault({})
    export type Cursor = z.infer<typeof Cursor>

    export const BookParams = z.object({
        token_id: z.string(),
        side:     Side,
    })
    export type BookParams = z.infer<typeof BookParams>

    export const Empty = z.object({}).loose().prefault({})

    export function Paginated<T extends z.ZodType>(item: T) {
        return z.object({
            limit:       z.number(),
            count:       z.number(),
            next_cursor: z.string(),
            data:        z.array(item),
        }).loose()
    }
}

export namespace ApiCredentials {
    export const Schema = z.object({
        key:        z.string(),
        secret:     z.string(),
        passphrase: z.string(),
    })
    export type Schema = z.infer<typeof Schema>
}
export type ApiCredentials = z.infer<typeof ApiCredentials.Schema>

export namespace PriceLevel {
    export const Schema = z.object({
        price: z.string(),
        size:  z.string(),
    }).loose()
}
export type PriceLevel = z.infer<typeof PriceLevel.Schema>

export namespace Token {
    export const Schema = z.object({
        token_id: z.string(),
        outcome:  z.string(),
        price:    z.number(),
        winner:   z.boolean().optional(),
    }).loose()
}
export type Token = z.infer<typeof Token.Schema>

export namespace Reward {
    export const Rate = z.object({
        asset_address: z.string().nullish(),
        rewards_daily_rate: z.number().nullish(),
    }).loose()

    export const Summary = z.object({
        rates:      z.array(Rate).nullish(),
        min_size:   z.number(),
        max_spread: z.number(),
    }).loose()

    export const Config = z.object({
        asset_address: z.string(),
        start_date:    z.string(),
        end_date:      z.string(),
        rate_per_day:  z.number(),
        total_rewards: z.number(),
    }).loose()

    export const Market = z.object({
        condition_id:       z.string(),
        question:           z.string(),
        market_slug:        z.string(),
        event_slug:         z.string(),
        image:              z.string(),
        rewards_max_spread: z.number(),
        rewards_min_size:   z.number(),
        tokens:             z.array(Token.Schema),
        rewards_config:     z.array(Config),
    }).loose()

    export const Earning = z.object({
        asset_address: z.string(),
        earnings:      z.number(),
        asset_rate:    z.number(),
    }).loose()

    export const UserEarning = z.object({
        date:          z.string(),
        condition_id:  z.string(),
        asset_address: z.string(),
        maker_address: z.string(),
        earnings:      z.number(),
        asset_rate:    z.number(),
    }).loose()

    export const TotalUserEarning = z.object({
        date:          z.string(),
        asset_address: z.string(),
        maker_address: z.string(),
        earnings:      z.number(),
        asset_rate:    z.number(),
    }).loose()

    export const UserMarketEarning = Market.extend({
        market_competitiveness: z.number(),
        maker_address:          z.string(),
        earning_percentage:     z.number(),
        earnings:               z.array(Earning),
    }).loose()
}

export namespace Market {
    export const Simplified = z.object({
        condition_id:     z.string(),
        rewards:          Reward.Summary,
        tokens:           z.array(Token.Schema),
        active:           z.boolean(),
        closed:           z.boolean(),
        archived:         z.boolean(),
        accepting_orders: z.boolean(),
    }).loose()

    export const Schema = Simplified.extend({
        enable_order_book:         z.boolean(),
        accepting_order_timestamp: z.string().nullish(),
        minimum_order_size:        z.number(),
        minimum_tick_size:         z.number(),
        question_id:               z.string(),
        question:                  z.string(),
        description:               z.string(),
        market_slug:               z.string(),
        end_date_iso:              z.string().nullish(),
        game_start_time:           z.string().nullish(),
        seconds_delay:             z.number(),
        fpmm:                      z.string(),
        maker_base_fee:            z.number(),
        taker_base_fee:            z.number(),
        notifications_enabled:     z.boolean(),
        neg_risk:                  z.boolean(),
        neg_risk_market_id:        z.string(),
        neg_risk_request_id:       z.string(),
        icon:                      z.string(),
        image:                     z.string(),
        is_50_50_outcome:          z.boolean(),
        tags:                      z.array(z.string()).nullish(),
    }).loose()

    export const FeeDetails = z.object({
        r:  z.number().optional(),
        e:  z.number().optional(),
        to: z.boolean().optional(),
    }).loose()

    export const ClobRewards = z.object({
        mi:   z.number().optional(),
        ma:   z.number().optional(),
        e:    z.boolean().optional(),
        smoa: z.boolean().optional(),
        moas: z.number().optional(),
    }).loose()

    export const ClobToken = z.object({
        t: z.string(),
        o: z.string(),
    }).loose()

    export const ClobInfo = z.object({
        c:     z.string(),
        t:     z.tuple([ClobToken, ClobToken]),
        mts:   z.number(),
        nr:    z.boolean().optional(),
        fd:    FeeDetails.optional(),
        mbf:   z.number().optional(),
        tbf:   z.number().optional(),
        r:     ClobRewards.nullish(),
        ao:    z.boolean().optional(),
        mos:   z.number().optional(),
        sd:    z.number().optional(),
        gst:   z.string().optional(),
        cbos:  z.boolean().optional(),
        aot:   z.string().optional(),
        rfqe:  z.boolean().optional(),
        itode: z.boolean().optional(),
        ibce:  z.boolean().optional(),
    }).loose()
}
export type Market = z.infer<typeof Market.Schema>

export namespace OrderBook {
    export const Schema = z.object({
        market:           z.string(),
        asset_id:         z.string(),
        timestamp:        z.string(),
        hash:             z.string(),
        bids:             z.array(PriceLevel.Schema),
        asks:             z.array(PriceLevel.Schema),
        min_order_size:   z.string(),
        tick_size:        z.string(),
        neg_risk:         z.boolean(),
        last_trade_price: z.string().nullish(),
    }).loose()
}
export type OrderBook = z.infer<typeof OrderBook.Schema>

export namespace MarketData {
    export const Midpoint = z.object({
        mid: z.string(),
    }).loose()

    export const Price = z.object({
        price: z.string(),
    }).loose()

    export const Spread = z.object({
        spread: z.string(),
    }).loose()

    export const LastTradePrice = z.object({
        price: z.string(),
        side:  Common.SideOrEmpty.nullish(),
    }).loose()

    export const BatchValue = z.object({
        token_id: z.string(),
        side:     Common.Side.nullish(),
        price:    z.string().nullish(),
        mid:      z.string().nullish(),
        spread:   z.string().nullish(),
    }).loose()

    export const PricePoint = z.object({
        t: z.number(),
        p: z.number(),
    }).loose()
}

export namespace Order {
    export const Limit = z.object({
        tokenID:        z.string(),
        price:          z.number(),
        size:           z.number(),
        side:           Common.Side,
        metadata:       z.string().optional(),
        builderCode:    z.string().optional(),
        expiration:     z.number().int().nonnegative().optional(),
        userUSDCBalance: z.number().nonnegative().optional(),
        feeRateBps:     z.number().int().nonnegative().optional(),
        nonce:          z.number().int().nonnegative().optional(),
        taker:          z.string().optional(),
    })

    export const Market = z.object({
        tokenID:        z.string(),
        price:          z.number().optional(),
        amount:         z.number().positive(),
        side:           Common.Side,
        orderType:      z.enum(["FOK", "FAK"]).optional(),
        userUSDCBalance: z.number().nonnegative().optional(),
        metadata:       z.string().optional(),
        builderCode:    z.string().optional(),
        feeRateBps:     z.number().int().nonnegative().optional(),
        nonce:          z.number().int().nonnegative().optional(),
        taker:          z.string().optional(),
    })

    export const CreateOptions = z.object({
        tickSize: Common.TickSize.optional(),
        negRisk:  z.boolean().optional(),
        version:  Common.OrderVersion.optional(),
    })

    export const ExchangeV3Amounts = z.object({
        tokenID:      z.string(),
        makerAmount:  z.string(),
        takerAmount:  z.string(),
        side:         Common.Side,
        metadata:     z.string().optional(),
        builderCode:  z.string().optional(),
        expiration:   z.number().int().nonnegative().optional(),
    })

    export const Signed = z.object({
        salt:          z.union([z.number(), z.string(), z.bigint()]),
        maker:         z.string(),
        signer:        z.string(),
        taker:         z.string(),
        tokenId:       z.string(),
        makerAmount:   z.string(),
        takerAmount:   z.string(),
        side:          z.union([z.number(), z.string()]),
        signatureType: Common.SignatureType,
        signature:     z.string(),
        expiration:    z.string().nullish(),
        nonce:         z.string().nullish(),
        feeRateBps:    z.string().nullish(),
        timestamp:     z.string().nullish(),
        metadata:      z.string().nullish(),
        builder:       z.string().nullish(),
    }).loose()

    export const Response = z.object({
        success:            z.boolean(),
        errorMsg:           z.string(),
        orderID:            z.string(),
        transactionsHashes: z.array(z.string()).optional(),
        tradeIDs:           z.array(z.string()).optional(),
        status:             z.string(),
        takingAmount:       z.string(),
        makingAmount:       z.string(),
    }).loose()

    export const CancelResponse = z.object({
        canceled:     z.array(z.string()),
        not_canceled: z.record(z.string(), z.string()),
    }).loose()

    export const Open = z.object({
        id:               z.string(),
        status:           z.string(),
        owner:            z.string(),
        maker_address:    z.string(),
        market:           z.string(),
        asset_id:         z.string(),
        side:             z.string(),
        original_size:    z.string(),
        size_matched:     z.string(),
        price:            z.string(),
        associate_trades: z.array(z.string()),
        outcome:          z.string(),
        created_at:       z.number(),
        expiration:       z.string(),
        order_type:       z.string(),
    }).loose()
}

export namespace Trade {
    export const MakerOrder = z.object({
        order_id:      z.string(),
        owner:         z.string(),
        maker_address: z.string(),
        matched_amount: z.string(),
        price:         z.string(),
        fee_rate_bps:  z.string(),
        asset_id:      z.string(),
        outcome:       z.string(),
        side:          Common.Side.optional(),
        builder_fee:   z.string().optional(),
        builder_code:  z.string().optional(),
    }).loose()

    export const Schema = z.object({
        id:               z.string(),
        taker_order_id:   z.string(),
        market:           z.string(),
        asset_id:         z.string(),
        side:             Common.Side,
        size:             z.string(),
        fee_rate_bps:     z.string(),
        price:            z.string(),
        status:           z.string(),
        match_time:       z.string(),
        match_time_nano:  z.string().optional(),
        last_update:      z.string(),
        outcome:          z.string(),
        bucket_index:     z.number(),
        owner:            z.string(),
        maker_address:    z.string(),
        maker_orders:     z.array(MakerOrder),
        transaction_hash: z.string().optional(),
        err_msg:          z.string().nullish(),
        trader_side:      z.enum(["TAKER", "MAKER"]),
    }).loose()

    export const Paginated = z.object({
        trades:      z.array(Schema),
        next_cursor: z.string(),
        limit:       z.number(),
        count:       z.number(),
    }).loose()
}

export namespace BalanceAllowance {
    export const Schema = z.object({
        balance:    z.string(),
        allowances: z.record(z.string(), z.string()),
    }).loose()
}

export namespace Notification {
    export const Schema = z.object({
        type:    z.number(),
        owner:   z.string(),
        payload: z.unknown(),
    }).loose()
}

export namespace Builder {
    export const Trade = z.object({
        id:              z.string(),
        tradeType:       z.string(),
        takerOrderHash:  z.string(),
        builder:         z.string(),
        market:          z.string(),
        assetId:         z.string(),
        side:            z.string(),
        size:            z.string(),
        sizeUsdc:        z.string(),
        price:           z.string(),
        status:          z.string(),
        outcome:         z.string(),
        outcomeIndex:    z.number(),
        owner:           z.string(),
        maker:           z.string(),
        transactionHash: z.string(),
        matchTime:       z.string(),
        bucketIndex:     z.number(),
        fee:             z.string(),
        feeUsdc:         z.string(),
        builderFee:      z.string(),
        builderCode:     z.string(),
        err_msg:         z.string().nullish(),
        createdAt:       z.string().nullish(),
        updatedAt:       z.string().nullish(),
    }).loose()

    export const Trades = z.object({
        trades:      z.array(Trade),
        next_cursor: z.string(),
        limit:       z.number(),
        count:       z.number(),
    }).loose()

    export const ApiKey = z.object({
        key:       z.string(),
        createdAt: z.string().optional(),
        revokedAt: z.string().optional(),
    }).loose()
}

export namespace MarketTradeEvent {
    export const Schema = z.object({
        event_type: z.string(),
        market: z.object({
            condition_id: z.string(),
            asset_id:     z.string(),
            question:     z.string(),
            icon:         z.string(),
            slug:         z.string(),
        }).loose(),
        user: z.object({
            address:                   z.string(),
            username:                  z.string(),
            profile_picture:           z.string(),
            optimized_profile_picture: z.string(),
            pseudonym:                 z.string(),
        }).loose(),
        side:             Common.Side,
        size:             z.string(),
        fee_rate_bps:     z.string(),
        price:            z.string(),
        outcome:          z.string(),
        outcome_index:    z.number(),
        transaction_hash: z.string(),
        timestamp:        z.string(),
    }).loose()
}
