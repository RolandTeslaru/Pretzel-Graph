"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Holder = void 0;
const zod_1 = require("zod");
/**
 * A wallet holding one side of a market, and how much of it.
 *
 * The Data API answers with a profile card per holder — avatars, bio, display settings. The
 * question a holder list actually answers is which wallets are on each side and how concentrated
 * they are, so this keeps the address, a name if there is one, and the size.
 */
var Holder;
(function (Holder) {
    Holder.Schema = zod_1.z.object({
        wallet: zod_1.z.string().nullable(),
        /** Falls back to the auto-generated pseudonym; null when the wallet has neither. */
        name: zod_1.z.string().nullable(),
        /** Token count, not dollars. */
        amount: zod_1.z.number().nullable(),
    });
    Holder.fromData = (holder) => ({
        wallet: holder.proxyWallet ?? null,
        name: holder.name || holder.pseudonym || null,
        amount: holder.amount ?? null,
    });
    /**
     * Holders of one outcome token.
     *
     * `asset` and `outcomeIndex` are dropped from each holder rather than projected away: both are
     * properties of this group, not of a holder. `asset` is byte-identical to `token` and repeats
     * 20 times; `outcomeIndex` is the same value for every holder in the group.
     */
    let Side;
    (function (Side) {
        Side.Schema = zod_1.z.object({
            token: zod_1.z.string().nullable(),
            outcomeIndex: zod_1.z.number().int().nullable(),
            holders: zod_1.z.array(Holder.Schema),
        });
        Side.fromData = (side) => {
            const holders = side.holders ?? [];
            return {
                token: side.token ?? null,
                outcomeIndex: holders[0]?.outcomeIndex ?? null,
                holders: holders.map(Holder.fromData),
            };
        };
    })(Side = Holder.Side || (Holder.Side = {}));
})(Holder || (exports.Holder = Holder = {}));
