"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = void 0;
const zod_1 = require("zod");
/**
 * The person, or thing, behind a wallet address.
 *
 * Most addresses have none — `wallets.identity` answers null for those rather than treating it as
 * a failure. `Gamma.Profile` declares `bio` and `xUsername`, but `/public-profile` does not return
 * them; only the endpoints that embed a profile inside something else do.
 */
var Profile;
(function (Profile) {
    Profile.Schema = zod_1.z.object({
        wallet: zod_1.z.string().nullable(),
        /** The chosen display name, falling back to the auto-generated pseudonym. */
        name: zod_1.z.string().nullable(),
        pseudonym: zod_1.z.string().nullable(),
        verified: zod_1.z.boolean().nullable(),
        createdAt: zod_1.z.string().nullable(),
        /**
         * Polymarket's fee tier and the volume it is computed from. The clearest available signal
         * of how significant a trader an address is — 0 for most, and it isn't documented.
         */
        takerTier: zod_1.z.number().nullable(),
        weightedVolume: zod_1.z.number().nullable(),
    });
    Profile.fromGamma = (profile) => {
        const loose = profile;
        const number = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
        return {
            wallet: profile.proxyWallet ?? null,
            name: profile.name || null,
            pseudonym: profile.pseudonym || null,
            verified: profile.verifiedBadge ?? null,
            createdAt: profile.createdAt ?? null,
            takerTier: number(loose.takerTier),
            weightedVolume: number(loose.weightedVolume),
        };
    };
})(Profile || (exports.Profile = Profile = {}));
