import { z } from "zod"

import * as CLOB from "./schemas"

// Ids end up in a URL path or query string, where encodeURIComponent preserves stray whitespace
// as %20 rather than dropping it — so an untrimmed id 404s instead of failing loudly. Trimming at
// the request boundary covers every caller: node fields and agent-supplied tool arguments alike.
const ConditionIdValue = z.string().trim().regex(
    /^0x[a-fA-F0-9]{64}$/,
    "must be a 0x-prefixed, 64-character hex condition id",
)
const TokenIdValue = z.string().trim().min(1, "must not be empty")

const ConditionId = z.object({ condition_id: ConditionIdValue })
const TokenId     = z.object({ token_id: TokenIdValue })
const OrderId     = z.object({ order_id: z.string().trim().min(1, "must not be empty") })
const DateQuery   = z.object({
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a YYYY-MM-DD date"),
})

const MarketsPage           = CLOB.Common.Paginated(CLOB.Market.Schema)
const SimplifiedMarketsPage = CLOB.Common.Paginated(CLOB.Market.Simplified)

export namespace CLOBAPI {
    /** Health, version and clock endpoints; heartbeat requires L2 authentication. */
    export namespace System {
        export namespace Status {
            export const Request  = CLOB.Common.Empty
            export const Response = z.string()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Version {
            export const Request  = CLOB.Common.Empty
            export const Response = z.number()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Time {
            export const Request  = CLOB.Common.Empty
            export const Response = z.number()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Heartbeat {
            export const Request = z.object({
                heartbeat_id: z.string().optional(),
            }).prefault({})
            export const Response = z.object({
                heartbeat_id: z.string(),
                error_msg:    z.string().optional(),
            }).loose()
            export type Request  = z.input<typeof Request>
            export type Response = z.infer<typeof Response>
        }
    }

    /** CLOB-native market configuration used by the matching engine. */
    export namespace Markets {
        export namespace List {
            export const Request  = CLOB.Common.Cursor
            export const Response = MarketsPage
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListSampling {
            export const Request  = CLOB.Common.Cursor
            export const Response = MarketsPage
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListSimplified {
            export const Request  = CLOB.Common.Cursor
            export const Response = SimplifiedMarketsPage
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListSamplingSimplified {
            export const Request  = CLOB.Common.Cursor
            export const Response = SimplifiedMarketsPage
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Get {
            export const Request  = ConditionId
            export const Response = CLOB.Market.Schema
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetClobInfo {
            export const Request  = ConditionId
            export const Response = CLOB.Market.ClobInfo
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** Public order-book and price endpoints; no wallet or API key is required. */
    export namespace MarketData {
        export namespace GetOrderBook {
            export const Request  = TokenId
            export const Response = CLOB.OrderBook.Schema
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetOrderBooks {
            export const Request = z.object({
                params: z.array(CLOB.Common.BookParams),
            })
            export const Response = z.array(CLOB.OrderBook.Schema)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetTickSize {
            export const Request  = TokenId
            export const Response = CLOB.Common.TickSize
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetNegRisk {
            export const Request  = TokenId
            export const Response = z.boolean()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetFeeRate {
            export const Request  = TokenId
            export const Response = z.number()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetFeeExponent {
            export const Request  = TokenId
            export const Response = z.number()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetMidpoint {
            export const Request  = TokenId
            export const Response = CLOB.MarketData.Midpoint
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetMidpoints {
            export const Request = z.object({
                params: z.array(CLOB.Common.BookParams),
            })
            export const Response = z.record(z.string(), z.string())
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetPrice {
            export const Request = TokenId.extend({
                side: CLOB.Common.Side,
            })
            export const Response = CLOB.MarketData.Price
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetPrices {
            export const Request = z.object({
                params: z.array(CLOB.Common.BookParams),
            })
            export const Response = z.record(
                z.string(),
                z.object({
                    BUY:  z.string().optional(),
                    SELL: z.string().optional(),
                }).loose(),
            )
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetSpread {
            export const Request  = TokenId
            export const Response = CLOB.MarketData.Spread
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetSpreads {
            export const Request = z.object({
                params: z.array(CLOB.Common.BookParams),
            })
            export const Response = z.record(z.string(), z.string())
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetLastTradePrice {
            export const Request  = TokenId
            export const Response = CLOB.MarketData.LastTradePrice
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetLastTradePrices {
            export const Request = z.object({
                params: z.array(CLOB.Common.BookParams),
            })
            export const Response = z.array(CLOB.MarketData.BatchValue)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetPriceHistory {
            export const Request = z.object({
                market:   z.string().optional(),
                startTs:  z.number().optional(),
                endTs:    z.number().optional(),
                fidelity: z.number().optional(),
                interval: CLOB.Common.PriceHistoryInterval.optional(),
            }).prefault({})
            // The endpoint wraps the series in { history: [...] }; unwrapped here so callers get
            // the series itself, the way every other list-shaped response arrives.
            export const Response = z
                .object({ history: z.array(CLOB.MarketData.PricePoint) })
                .transform(body => body.history)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace HashOrderBook {
            export const Request = z.object({
                order_book: CLOB.OrderBook.Schema,
            })
            export const Response = z.string()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CalculateMarketPrice {
            export const Request = TokenId.extend({
                side:       CLOB.Common.Side,
                amount:     z.number().positive(),
                order_type: CLOB.Common.OrderType.optional(),
            })
            export const Response = z.number()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** Authenticated account state. */
    export namespace Account {
        export namespace GetClosedOnlyMode {
            export const Request  = CLOB.Common.Empty
            export const Response = z.object({
                closed_only: z.boolean(),
            }).loose()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** Local order signing plus authenticated placement, query and cancellation. */
    export namespace Orders {
        export namespace Create {
            export const Request = z.object({
                order:   CLOB.Order.Limit,
                options: CLOB.Order.CreateOptions.optional(),
            })
            export const Response = CLOB.Order.Signed
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CreateMarket {
            export const Request = z.object({
                order:   CLOB.Order.Market,
                options: CLOB.Order.CreateOptions.optional(),
            })
            export const Response = CLOB.Order.Signed
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CreateExchangeV3 {
            export const Request  = CLOB.Order.ExchangeV3Amounts
            export const Response = CLOB.Order.Signed
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Post {
            export const Request = z.object({
                order:      CLOB.Order.Signed,
                order_type: CLOB.Common.OrderType.optional(),
                post_only:  z.boolean().optional(),
                defer_exec: z.boolean().optional(),
            })
            export const Response = CLOB.Order.Response
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace PostMany {
            export const Request = z.object({
                orders: z.array(z.object({
                    order:      CLOB.Order.Signed,
                    order_type: CLOB.Common.OrderType,
                })),
                post_only:  z.boolean().optional(),
                defer_exec: z.boolean().optional(),
            })
            export const Response = z.array(CLOB.Order.Response)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CreateAndPost {
            export const Request = Create.Request.extend({
                order_type: z.enum(["GTC", "GTD"]).optional(),
                post_only:  z.boolean().optional(),
                defer_exec: z.boolean().optional(),
            })
            export const Response = CLOB.Order.Response
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CreateAndPostMarket {
            export const Request = CreateMarket.Request.extend({
                order_type: z.enum(["FOK", "FAK"]).optional(),
                defer_exec: z.boolean().optional(),
            })
            export const Response = CLOB.Order.Response
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Get {
            export const Request  = OrderId
            export const Response = CLOB.Order.Open
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListOpen {
            export const Request = z.object({
                id:              z.string().optional(),
                market:          z.string().optional(),
                asset_id:        z.string().optional(),
                only_first_page: z.boolean().optional(),
                next_cursor:     z.string().optional(),
            }).prefault({})
            export const Response = z.array(CLOB.Order.Open)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListPreMigration {
            export const Request = z.object({
                only_first_page: z.boolean().optional(),
                next_cursor:     z.string().optional(),
            }).prefault({})
            export const Response = z.array(CLOB.Order.Open)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Cancel {
            export const Request  = OrderId
            export const Response = CLOB.Order.CancelResponse
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CancelMany {
            export const Request = z.object({
                order_ids: z.array(z.string()),
            })
            export const Response = CLOB.Order.CancelResponse
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CancelAll {
            export const Request  = CLOB.Common.Empty
            export const Response = CLOB.Order.CancelResponse
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace CancelMarket {
            export const Request = z.object({
                market:   z.string().optional(),
                asset_id: z.string().optional(),
            }).prefault({})
            export const Response = CLOB.Order.CancelResponse
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace IsScoring {
            export const Request = OrderId
            export const Response = z.object({
                scoring: z.boolean(),
            }).loose()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace AreScoring {
            export const Request = z.object({
                order_ids: z.array(z.string()),
            })
            export const Response = z.record(z.string(), z.boolean())
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** User fills require authentication; market trade events are public. */
    export namespace Trades {
        export const Query = z.object({
            id:              z.string().optional(),
            maker_address:   z.string().optional(),
            market:          z.string().optional(),
            asset_id:        z.string().optional(),
            before:          z.string().optional(),
            after:           z.string().optional(),
            only_first_page: z.boolean().optional(),
            next_cursor:     z.string().optional(),
        })

        export namespace List {
            export const Request  = Query.prefault({})
            export const Response = z.array(CLOB.Trade.Schema)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListPaginated {
            export const Request  = Query.omit({ only_first_page: true }).prefault({})
            export const Response = CLOB.Trade.Paginated
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListMarketEvents {
            export const Request  = ConditionId
            export const Response = z.array(CLOB.MarketTradeEvent.Schema)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** Authenticated collateral or conditional-token balances and allowances. */
    export namespace Balances {
        export const Query = z.object({
            asset_type: CLOB.Common.AssetType,
            token_id:   z.string().optional(),
        })

        export namespace GetAllowance {
            export const Request  = Query
            export const Response = CLOB.BalanceAllowance.Schema
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace UpdateAllowance {
            export const Request  = Query
            export const Response = z.void()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** Authenticated account notifications. */
    export namespace Notifications {
        export namespace List {
            export const Request  = CLOB.Common.Empty
            export const Response = z.array(CLOB.Notification.Schema)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace Delete {
            export const Request = z.object({
                ids: z.array(z.string()).optional(),
            }).prefault({})
            export const Response = z.void()
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** Reward configurations are public; user earnings require authentication. */
    export namespace Rewards {
        export namespace ListDailyEarnings {
            export const Request  = DateQuery
            export const Response = z.array(CLOB.Reward.UserEarning)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListDailyTotals {
            export const Request  = DateQuery
            export const Response = z.array(CLOB.Reward.TotalUserEarning)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListUserMarkets {
            export const Request = DateQuery.extend({
                order_by:      z.string().optional(),
                position:      z.string().optional(),
                no_competition:z.boolean().optional(),
            })
            export const Response = z.array(CLOB.Reward.UserMarketEarning)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetPercentages {
            export const Request  = CLOB.Common.Empty
            export const Response = z.record(z.string(), z.number())
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace ListCurrent {
            export const Request  = CLOB.Common.Empty
            export const Response = z.array(CLOB.Reward.Market)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }

        export namespace GetMarket {
            export const Request  = ConditionId
            export const Response = z.array(CLOB.Reward.Market)
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }

    /** Public builder-attributed trades. */
    export namespace Builders {
        export namespace ListTrades {
            export const Request  = CLOBAPI.Trades.Query.omit({
                only_first_page: true,
            }).extend({
                builder_code: z.string(),
            })
            export const Response = CLOB.Builder.Trades
            export type Request   = z.input<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
    }
}
