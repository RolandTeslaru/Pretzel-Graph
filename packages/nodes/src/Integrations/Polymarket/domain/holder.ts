import { z } from "zod"

import { Data } from "./Data"


/**
 * A wallet holding one side of a market, and how much of it.
 *
 * The Data API answers with a profile card per holder — avatars, bio, display settings. The
 * question a holder list actually answers is which wallets are on each side and how concentrated
 * they are, so this keeps the address, a name if there is one, and the size.
 */
export namespace Holder {

    export const Schema = z.object({
        wallet: z.string().nullable(),
        /** Falls back to the auto-generated pseudonym; null when the wallet has neither. */
        name:   z.string().nullable(),
        /** Token count, not dollars. */
        amount: z.number().nullable(),
    })

    export const fromData = (holder: Data.Holder): Holder => ({
        wallet: holder.proxyWallet ?? null,
        name:   holder.name || holder.pseudonym || null,
        amount: holder.amount ?? null,
    })


    /**
     * Holders of one outcome token.
     *
     * `asset` and `outcomeIndex` are dropped from each holder rather than projected away: both are
     * properties of this group, not of a holder. `asset` is byte-identical to `token` and repeats
     * 20 times; `outcomeIndex` is the same value for every holder in the group.
     */
    export namespace Side {

        export const Schema = z.object({
            token:        z.string().nullable(),
            outcomeIndex: z.number().int().nullable(),
            holders:      z.array(Holder.Schema),
        })

        export const fromData = (side: z.infer<typeof Data.Holder.Market>): Side => {
            const holders = side.holders ?? []

            return {
                token:        side.token ?? null,
                outcomeIndex: holders[0]?.outcomeIndex ?? null,
                holders:      holders.map(Holder.fromData),
            }
        }
    }

    export type Side = z.infer<typeof Side.Schema>
}

export type Holder = z.infer<typeof Holder.Schema>
