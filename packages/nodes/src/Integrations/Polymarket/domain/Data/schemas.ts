import { z } from "zod"

export namespace Common {
    export const WalletAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/)
    export type WalletAddress = z.infer<typeof WalletAddress>

    export const ConditionId = z
        .string()
        .trim()
        .regex(/^0x[a-fA-F0-9]{64}$/)
        .brand("PolymarketConditionId")
    export type ConditionId = z.infer<typeof ConditionId>

    export const ConditionIdOrEmpty = z.union([
        ConditionId,
        z.literal(""),
    ])
    export type ConditionIdOrEmpty = z.infer<typeof ConditionIdOrEmpty>

    // Coerced: node fields and tool arguments both arrive as strings, and Number() ignores
    // surrounding whitespace — so "  12  " lands as 12 and "abc" fails the int check here
    // rather than in each caller.
    export const EventId = z.coerce.number().int().min(1)
    export type EventId = z.infer<typeof EventId>

    export const Side          = z.enum(["BUY", "SELL"])
    export const SideOrEmpty   = z.union([Side, z.literal("")])
    export const SortDirection = z.enum(["ASC", "DESC"])
    export const TimePeriod    = z.enum(["DAY", "WEEK", "MONTH", "ALL"])

    export type Side          = z.infer<typeof Side>
    export type SideOrEmpty   = z.infer<typeof SideOrEmpty>
    export type SortDirection = z.infer<typeof SortDirection>
    export type TimePeriod    = z.infer<typeof TimePeriod>

    export const Pagination = z
        .object({
            limit:       z.number().int().nullish(),
            offset:      z.number().int().nullish(),
            has_more:    z.boolean().nullish(),
            next_cursor: z.string().nullish(),
        })
        .loose()
    export type Pagination = z.infer<typeof Pagination>
}

/**
 * The Data API evolves independently of PretzelGraph. Entity schemas preserve
 * unknown response fields while describing the documented public surface.
 */

export namespace Status {
    export const Schema = z
        .object({
            data: z.string().nullish(),
        })
        .loose()
}
export type Status = z.infer<typeof Status.Schema>

export namespace Combo {
    export const ConditionId = z
        .string()
        .trim()
        .regex(/^0x[a-fA-F0-9]{62}$/)
        .brand("PolymarketComboConditionId")
    export type ConditionId = z.infer<typeof ConditionId>

    export const LegStatus = z.enum([
        "OPEN",
        "RESOLVED_PARTIAL",
        "RESOLVED_WIN",
        "RESOLVED_LOSS",
    ])
    export type LegStatus = z.infer<typeof LegStatus>

    export const Event = z
        .object({
            event_id:    z.string().nullish(),
            event_slug:  z.string().nullish(),
            event_title: z.string().nullish(),
            event_image: z.string().nullish(),
        })
        .loose()

    export const Market = z
        .object({
            market_id:   z.string().nullish(),
            slug:        z.string().nullish(),
            title:       z.string().nullish(),
            outcome:     z.string().nullish(),
            image_url:   z.string().nullish(),
            icon_url:    z.string().nullish(),
            category:    z.string().nullish(),
            subcategory: z.string().nullish(),
            tags:        z.array(z.string()).nullish(),
            end_date:    z.string().nullish(),
            event:       Event.nullish(),
        })
        .loose()

    export const Leg = z
        .object({
            leg_index:         z.number().int().nullish(),
            leg_position_id:   z.string().nullish(),
            leg_condition_id:  z.string().nullish(),
            leg_outcome_index: z.number().int().nullish(),
            leg_outcome_label: z.string().nullish(),
            leg_status:        LegStatus.nullish(),
            leg_resolved_at:   z.string().nullish(),
            leg_current_price: z.string().nullish(),
            market:            Market.nullish(),
        })
        .loose()
}

const ComboConditionId = Combo.ConditionId
const ComboLeg         = Combo.Leg

export namespace Position {
    export const Schema = z
        .object({
            proxyWallet:        Common.WalletAddress.nullish(),
            asset:              z.string().nullish(),
            conditionId:        Common.ConditionId.nullish(),
            size:               z.number().nullish(),
            avgPrice:           z.number().nullish(),
            initialValue:       z.number().nullish(),
            currentValue:       z.number().nullish(),
            cashPnl:            z.number().nullish(),
            percentPnl:         z.number().nullish(),
            totalBought:        z.number().nullish(),
            realizedPnl:        z.number().nullish(),
            percentRealizedPnl: z.number().nullish(),
            curPrice:           z.number().nullish(),
            redeemable:         z.boolean().nullish(),
            mergeable:          z.boolean().nullish(),
            title:              z.string().nullish(),
            slug:               z.string().nullish(),
            icon:               z.string().nullish(),
            eventSlug:          z.string().nullish(),
            outcome:            z.string().nullish(),
            outcomeIndex:       z.number().int().nullish(),
            oppositeOutcome:    z.string().nullish(),
            oppositeAsset:      z.string().nullish(),
            endDate:            z.string().nullish(),
            negativeRisk:       z.boolean().nullish(),
        })
        .loose()

    export const Closed = z
        .object({
            proxyWallet:     Common.WalletAddress.nullish(),
            asset:           z.string().nullish(),
            conditionId:     Common.ConditionId.nullish(),
            avgPrice:        z.number().nullish(),
            totalBought:     z.number().nullish(),
            realizedPnl:     z.number().nullish(),
            curPrice:        z.number().nullish(),
            timestamp:       z.number().int().nullish(),
            title:           z.string().nullish(),
            slug:            z.string().nullish(),
            icon:            z.string().nullish(),
            eventSlug:       z.string().nullish(),
            outcome:         z.string().nullish(),
            outcomeIndex:    z.number().int().nullish(),
            oppositeOutcome: z.string().nullish(),
            oppositeAsset:   z.string().nullish(),
            endDate:         z.string().nullish(),
        })
        .loose()

    export const Market = z
        .object({
            proxyWallet:  Common.WalletAddress.nullish(),
            name:         z.string().nullish(),
            profileImage: z.string().nullish(),
            verified:     z.boolean().nullish(),
            asset:        z.string().nullish(),
            conditionId:  Common.ConditionId.nullish(),
            avgPrice:     z.number().nullish(),
            size:         z.number().nullish(),
            currPrice:    z.number().nullish(),

            currentValue: z.number().nullish(),
            cashPnl:      z.number().nullish(),
            totalBought:  z.number().nullish(),
            realizedPnl:  z.number().nullish(),
            totalPnl:     z.number().nullish(),

            outcome:      z.string().nullish(),
            outcomeIndex: z.number().int().nullish(),
        })
        .loose()

    export const MarketGroup = z
        .object({
            token:     z.string().nullish(),
            positions: z.array(Market).nullish(),
        })
        .loose()

    export const ComboStatus = z.enum([
        "OPEN",
        "PARTIAL",
        "RESOLVED_PARTIAL",
        "RESOLVED_WIN",
        "RESOLVED_LOSS",
    ])
    export type ComboStatus = z.infer<typeof ComboStatus>

    export const Combo = z
        .object({
            combo_condition_id:    ComboConditionId.nullish(),
            combo_position_id:     z.string().nullish(),
            module_id:             z.number().int().nullish(),
            user_address:          Common.WalletAddress.nullish(),
            shares_balance:        z.string().nullish(),
            entry_avg_price_usdc:  z.string().nullish(),
            entry_cost_usdc:       z.string().nullish(),
            realized_payout_usdc:  z.string().nullish(),
            total_cost_usdc:       z.string().nullish(),
            gross_entry_cost_usdc: z.string().nullish(),
            entry_fees_usdc:       z.string().nullish(),
            status:                ComboStatus.nullish(),
            first_entry_at:        z.string().nullish(),
            resolved_at:           z.string().nullish(),
            updated_at:            z.string().nullish(),
            legs_total:            z.number().int().nullish(),
            legs_resolved:         z.number().int().nullish(),
            legs_pending:          z.number().int().nullish(),
            legs:                  z.array(ComboLeg).nullish(),
        })
        .loose()

    export const ComboPage = z
        .object({
            combos:     z.array(Combo),
            pagination: Common.Pagination,
        })
        .loose()
}
export type Position = z.infer<typeof Position.Schema>

export namespace Trade {
    export const Schema = z
        .object({
            proxyWallet:           Common.WalletAddress.nullish(),
            side:                  Common.Side.nullish(),
            asset:                 z.string().nullish(),
            conditionId:           Common.ConditionId.nullish(),
            size:                  z.number().nullish(),
            price:                 z.number().nullish(),
            timestamp:             z.number().int().nullish(),
            title:                 z.string().nullish(),
            slug:                  z.string().nullish(),
            icon:                  z.string().nullish(),
            eventSlug:             z.string().nullish(),
            outcome:               z.string().nullish(),
            outcomeIndex:          z.number().int().nullish(),
            name:                  z.string().nullish(),
            pseudonym:             z.string().nullish(),
            bio:                   z.string().nullish(),
            profileImage:          z.string().nullish(),
            profileImageOptimized: z.string().nullish(),
            transactionHash:       z.string().nullish(),
        })
        .loose()
}
export type Trade = z.infer<typeof Trade.Schema>

export namespace Activity {
    export const Type = z.enum([
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
    ])
    export type Type = z.infer<typeof Type>

    export const Schema = z
        .object({
            proxyWallet:           Common.WalletAddress.nullish(),
            timestamp:             z.number().int().nullish(),
            conditionId:           Common.ConditionIdOrEmpty.nullish(),
            type:                  Type.nullish(),
            size:                  z.number().nullish(),
            usdcSize:              z.number().nullish(),
            transactionHash:       z.string().nullish(),
            price:                 z.number().nullish(),
            asset:                 z.string().nullish(),
            side:                  Common.SideOrEmpty.nullish(),
            outcomeIndex:          z.number().int().nullish(),
            title:                 z.string().nullish(),
            slug:                  z.string().nullish(),
            icon:                  z.string().nullish(),
            eventSlug:             z.string().nullish(),
            outcome:               z.string().nullish(),
            name:                  z.string().nullish(),
            pseudonym:             z.string().nullish(),
            bio:                   z.string().nullish(),
            profileImage:          z.string().nullish(),
            profileImageOptimized: z.string().nullish(),
            isCombo:               z.boolean().nullish(),
        })
        .loose()

    export const ComboType = z.enum([
        "Split",
        "Merge",
        "Convert",
        "Compress",
        "Wrap",
        "Unwrap",
        "Redeem",
    ])

    export const Combo = z
        .object({
            id:                 z.string().nullish(),
            type:               ComboType.nullish(),
            event_kind:         z.string().nullish(),
            side:               ComboType.nullish(),
            module_kind:        z.string().nullish(),
            user_address:       Common.WalletAddress.nullish(),
            combo_condition_id: ComboConditionId.nullish(),
            combo_position_id:  z.string().nullish(),
            module_id:          z.number().int().nullish(),
            amount_usdc:        z.number().nullish(),
            payout_usdc:        z.number().nullish(),
            timestamp:          z.number().int().nullish(),
            tx_dttm:            z.string().nullish(),
            tx_hash:            z.string().nullish(),
            log_index:          z.number().int().nullish(),
            block_number:       z.number().int().nullish(),
            legs:               z.array(ComboLeg).nullish(),
        })
        .loose()

    export const ComboPage = z
        .object({
            activity:   z.array(Combo),
            pagination: Common.Pagination,
        })
        .loose()
}
export type Activity = z.infer<typeof Activity.Schema>

export namespace Holder {
    export const Schema = z
        .object({
            proxyWallet:           Common.WalletAddress.nullish(),
            bio:                   z.string().nullish(),
            asset:                 z.string().nullish(),
            pseudonym:             z.string().nullish(),
            amount:                z.number().nullish(),
            displayUsernamePublic: z.boolean().nullish(),
            outcomeIndex:          z.number().int().nullish(),
            name:                  z.string().nullish(),
            profileImage:          z.string().nullish(),
            profileImageOptimized: z.string().nullish(),
        })
        .loose()

    export const Market = z
        .object({
            token:   z.string().nullish(),
            holders: z.array(Schema).nullish(),
        })
        .loose()
}
export type Holder = z.infer<typeof Holder.Schema>

export namespace User {
    export const Traded = z
        .object({
            user:   Common.WalletAddress.nullish(),
            traded: z.number().int().nullish(),
        })
        .loose()

    export const Value = z
        .object({
            user:  Common.WalletAddress.nullish(),
            value: z.number().nullish(),
        })
        .loose()
}

export namespace Market {
    export const Identifier = z.union([
        Common.ConditionIdOrEmpty,
        z.literal("GLOBAL"),
    ])

    export const OpenInterest = z
        .object({
            market: Identifier.nullish(),
            value:  z.number().nullish(),
        })
        .loose()

    export const Volume = z
        .object({
            market: Identifier.nullish(),
            value:  z.number().nullish(),
        })
        .loose()

    export const LiveVolume = z
        .object({
            total:   z.number().nullish(),
            markets: z.array(Volume).nullish(),
        })
        .loose()
}

export namespace Leaderboard {
    export const Category = z.enum([
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
    ])
    export type Category = z.infer<typeof Category>

    export const OrderBy = z.enum(["PNL", "VOL"])
    export type OrderBy = z.infer<typeof OrderBy>

    export const Trader = z
        .object({
            rank:          z.string().nullish(),
            proxyWallet:   Common.WalletAddress.nullish(),
            userName:      z.string().nullish(),
            vol:           z.number().nullish(),
            pnl:           z.number().nullish(),
            profileImage:  z.string().nullish(),
            xUsername:     z.string().nullish(),
            verifiedBadge: z.boolean().nullish(),
        })
        .loose()
}

export namespace Builder {
    export const LeaderboardEntry = z
        .object({
            rank:         z.string().nullish(),
            builder:      z.string().nullish(),
            builderCode:  z.string().nullish(),
            volume:       z.number().nullish(),
            activeUsers:  z.number().int().nullish(),
            verified:     z.boolean().nullish(),
            builderLogo:  z.string().nullish(),
        })
        .loose()

    export const VolumeEntry = z
        .object({
            dt:          z.string().nullish(),
            builder:     z.string().nullish(),
            builderCode: z.string().nullish(),
            builderLogo: z.string().nullish(),
            verified:    z.boolean().nullish(),
            volume:      z.number().nullish(),
            activeUsers: z.number().int().nullish(),
            rank:        z.string().nullish(),
        })
        .loose()
}

export namespace Accounting {
    export const Snapshot = z.union([
        z.instanceof(ArrayBuffer),
        z.instanceof(Uint8Array),
    ])
    export type Snapshot = z.infer<typeof Snapshot>
}
