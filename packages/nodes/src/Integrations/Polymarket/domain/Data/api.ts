import { z } from "zod"

import * as Data from "./schemas"

export namespace DataAPI {
    function withMarketOrEventFilter<const T extends z.ZodRawShape>(
        shape: T,
    ) {
        return z.union([
            z.object({
                ...shape,
                market:  z.array(Data.Common.ConditionId),
                eventId: z.never().optional(),
            }),

            z.object({
                ...shape,
                market:  z.never().optional(),
                eventId: z.array(Data.Common.EventId),
            }),

            z.object({
                ...shape,
                market:  z.never().optional(),
                eventId: z.never().optional(),
            }),
        ])
    }

    export namespace Status {
        export namespace Get {
            export const Request = z.object({}).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = Data.Status.Schema
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Positions {
        export namespace ListCurrent {
            export const Request = withMarketOrEventFilter({
                user:          Data.Common.WalletAddress,
                sizeThreshold: z.number().min(0).default(1),
                redeemable:    z.boolean().default(false),
                mergeable:     z.boolean().default(false),
                limit:         z.number().int().min(0).max(500).default(100),
                offset:        z.number().int().min(0).max(10_000).default(0),
                sortBy:        z
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
                title:         z.string().max(100).optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Position.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListClosed {
            export const Request = withMarketOrEventFilter({
                user:          Data.Common.WalletAddress,
                title:         z.string().max(100).optional(),
                limit:         z.number().int().min(0).max(50).default(10),
                offset:        z.number().int().min(0).max(100_000).default(0),
                sortBy:        z
                    .enum([
                        "REALIZEDPNL",
                        "TITLE",
                        "PRICE",
                        "AVGPRICE",
                        "TIMESTAMP",
                    ])
                    .default("REALIZEDPNL"),
                sortDirection: Data.Common.SortDirection.default("DESC"),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Position.Closed)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListForMarket {
            export const Request = z.object({
                market:        Data.Common.ConditionId,
                user:          Data.Common.WalletAddress.optional(),
                status:        z.enum(["OPEN", "CLOSED", "ALL"]).default("ALL"),
                sortBy:        z
                    .enum([
                        "TOKENS",
                        "CASH_PNL",
                        "REALIZED_PNL",
                        "TOTAL_PNL",
                    ])
                    .default("TOTAL_PNL"),
                sortDirection: Data.Common.SortDirection.default("DESC"),
                limit:         z.number().int().min(0).max(500).default(50),
                offset:        z.number().int().min(0).max(10_000).default(0),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Position.MarketGroup)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListCombos {
            export const Request = z.object({
                user:          Data.Common.WalletAddress,
                status:        z.array(Data.Position.ComboStatus).optional(),
                sort:          z
                    .enum([
                        "current_value_desc",
                        "first_entry_desc",
                        "entry_cost_desc",
                        "resolved_at_desc",
                        "updated_asc",
                    ])
                    .default("current_value_desc"),
                market_id:     z.array(Data.Combo.ConditionId).optional(),
                limit:         z.number().int().min(0).max(1_000).default(20),
                offset:        z.number().int().min(0).max(100_000).default(0),
                updatedAfter:  z.number().int().optional(),
                updatedBefore: z.number().int().optional(),
                cursor:        z.string().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Data.Position.ComboPage
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Trades {
        export namespace List {
            export const Request = withMarketOrEventFilter({
                limit:        z.number().int().min(1).max(10_000).default(100),
                offset:       z.number().int().min(0).max(10_000).default(0),
                takerOnly:    z.boolean().default(true),
                filterType:   z.enum(["CASH", "TOKENS"]).optional(),
                filterAmount: z.number().min(0).optional(),
                user:         Data.Common.WalletAddress.optional(),
                side:         Data.Common.Side.optional(),
                start:        z.number().int().min(0).optional(),
                end:          z.number().int().min(0).optional(),
            })
                .refine(
                    ({ filterType, filterAmount }) =>
                        (filterType === undefined) ===
                        (filterAmount === undefined),
                    {
                        message:
                            "filterType and filterAmount must be provided together",
                    },
                )
                .prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Trade.Schema)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Activity {
        export namespace List {
            export const Request = withMarketOrEventFilter({
                limit:         z.number().int().min(0).max(500).default(100),
                offset:        z.number().int().min(0).max(5_000).default(0),
                user:          Data.Common.WalletAddress,
                type:          z.array(Data.Activity.Type).optional(),
                start:         z.number().int().min(0).optional(),
                end:           z.number().int().min(0).optional(),
                sortBy:        z
                    .enum(["TIMESTAMP", "TOKENS", "CASH"])
                    .default("TIMESTAMP"),
                sortDirection: Data.Common.SortDirection.default("DESC"),
                side:          Data.Common.Side.optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Activity.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListCombos {
            export const Request = z.object({
                user:      Data.Common.WalletAddress,
                market_id: z.array(Data.Combo.ConditionId).optional(),
                limit:     z.number().int().min(0).max(500).default(50),
                offset:    z.number().int().min(0).max(10_000).default(0),
                cursor:    z.string().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Data.Activity.ComboPage
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Users {
        export namespace GetValue {
            export const Request = z.object({
                user:   Data.Common.WalletAddress,
                market: z.array(Data.Common.ConditionId).optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.User.Value)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetTradedMarketCount {
            export const Request = z.object({
                user: Data.Common.WalletAddress,
            })
            export type Request = z.input<typeof Request>

            export const Response = Data.User.Traded
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Markets {
        export namespace ListHolders {
            export const Request = z.object({
                market:     z.array(Data.Common.ConditionId),
                limit:      z.number().int().min(1).max(20).default(20),
                minBalance: z
                    .number()
                    .int()
                    .min(0)
                    .max(999_999)
                    .default(1),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Holder.Market)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetOpenInterest {
            export const Request = z
                .object({
                    market: z.array(Data.Common.ConditionId).optional(),
                })
                .prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Market.OpenInterest)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetLiveVolume {
            export const Request = z.object({
                id: Data.Common.EventId,
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Market.LiveVolume)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Leaderboard {
        export namespace List {
            export const Request = z
                .object({
                    category:   Data.Leaderboard.Category.default("OVERALL"),
                    timePeriod: Data.Common.TimePeriod.default("DAY"),
                    orderBy:    Data.Leaderboard.OrderBy.default("PNL"),
                    limit:      z.number().int().min(1).max(50).default(25),
                    offset:     z.number().int().min(0).max(1_000).default(0),
                    user:       Data.Common.WalletAddress.optional(),
                    userName:   z.string().optional(),
                })
                .prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Leaderboard.Trader)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Builders {
        export namespace ListLeaderboard {
            export const Request = z
                .object({
                    timePeriod: Data.Common.TimePeriod.default("DAY"),
                    limit:      z.number().int().min(0).max(50).default(25),
                    offset:     z.number().int().min(0).max(1_000).default(0),
                })
                .prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Builder.LeaderboardEntry)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListVolume {
            export const Request = z
                .object({
                    timePeriod: Data.Common.TimePeriod.default("DAY"),
                })
                .prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Data.Builder.VolumeEntry)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Accounting {
        export namespace DownloadSnapshot {
            export const Request = z.object({
                user: Data.Common.WalletAddress,
            })
            export type Request = z.input<typeof Request>

            export const Response = Data.Accounting.Snapshot
            export type Response = z.infer<typeof Response>
        }
    }
}
