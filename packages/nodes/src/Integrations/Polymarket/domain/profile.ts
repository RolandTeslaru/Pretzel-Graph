import { z } from "zod"

import { Gamma } from "./Gamma"


/**
 * The person, or thing, behind a wallet address.
 *
 * Most addresses have none — `wallets.identity` answers null for those rather than treating it as
 * a failure. `Gamma.Profile` declares `bio` and `xUsername`, but `/public-profile` does not return
 * them; only the endpoints that embed a profile inside something else do.
 */
export namespace Profile {

    export const Schema = z.object({
        wallet: z.string().nullable(),
        /** The chosen display name, falling back to the auto-generated pseudonym. */
        name:      z.string().nullable(),
        pseudonym: z.string().nullable(),
        verified:  z.boolean().nullable(),
        createdAt: z.string().nullable(),

        /**
         * Polymarket's fee tier and the volume it is computed from. The clearest available signal
         * of how significant a trader an address is — 0 for most, and it isn't documented.
         */
        takerTier:      z.number().nullable(),
        weightedVolume: z.number().nullable(),
    })


    export const fromGamma = (profile: Gamma.Profile): Profile => {
        const loose = profile as Record<string, unknown>

        const number = (value: unknown): number | null =>
            typeof value === "number" && Number.isFinite(value) ? value : null

        return {
            wallet:    profile.proxyWallet ?? null,
            name:      profile.name        || null,
            pseudonym: profile.pseudonym   || null,
            verified:  profile.verifiedBadge ?? null,
            createdAt: profile.createdAt     ?? null,

            takerTier:      number(loose.takerTier),
            weightedVolume: number(loose.weightedVolume),
        }
    }
}

export type Profile = z.infer<typeof Profile.Schema>
