"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Position = void 0;
const zod_1 = require("zod");
const activity_1 = require("./activity");
/**
 * What a wallet holds in one outcome, and how that holding has done.
 *
 * Not an Activity: an activity is something that happened, a position is something still held. They
 * share the wallet, market and token references and diverge after that — a position carries cost
 * basis and profit instead of a size and a transaction hash.
 */
var Position;
(function (Position) {
    const text = (value) => value ? value : null;
    const references = (position) => ({
        wallet: position.proxyWallet ?? null,
        market: {
            conditionId: text(position.conditionId),
            question: text(position.title),
            slug: text(position.slug),
            eventSlug: text(position.eventSlug),
        },
        token: {
            id: text(position.asset),
            outcome: text(position.outcome),
            index: position.outcomeIndex ?? null,
        },
    });
    /** A holding that is still open. */
    Position.Schema = zod_1.z.object({
        wallet: zod_1.z.string().nullable(),
        market: activity_1.Activity.MarketRef,
        token: activity_1.Activity.TokenRef,
        /** Token count held. */
        size: zod_1.z.number().nullable(),
        /** What it cost on average, against what it's worth now. */
        avgPrice: zod_1.z.number().nullable(),
        curPrice: zod_1.z.number().nullable(),
        initialValue: zod_1.z.number().nullable(),
        currentValue: zod_1.z.number().nullable(),
        /** Unrealised, on the holding as it stands. */
        cashPnl: zod_1.z.number().nullable(),
        percentPnl: zod_1.z.number().nullable(),
        /** Resolved and claimable, versus poolable back into collateral. */
        redeemable: zod_1.z.boolean().nullable(),
        mergeable: zod_1.z.boolean().nullable(),
        endDate: zod_1.z.string().nullable(),
    });
    Position.fromData = (position) => ({
        ...references(position),
        size: position.size ?? null,
        avgPrice: position.avgPrice ?? null,
        curPrice: position.curPrice ?? null,
        initialValue: position.initialValue ?? null,
        currentValue: position.currentValue ?? null,
        cashPnl: position.cashPnl ?? null,
        percentPnl: position.percentPnl ?? null,
        redeemable: position.redeemable ?? null,
        mergeable: position.mergeable ?? null,
        endDate: text(position.endDate),
    });
    /** A holding that has been settled — what it actually made, rather than what it might. */
    let Closed;
    (function (Closed) {
        Closed.Schema = zod_1.z.object({
            wallet: zod_1.z.string().nullable(),
            market: activity_1.Activity.MarketRef,
            token: activity_1.Activity.TokenRef,
            avgPrice: zod_1.z.number().nullable(),
            curPrice: zod_1.z.number().nullable(),
            totalBought: zod_1.z.number().nullable(),
            realizedPnl: zod_1.z.number().nullable(),
            timestamp: zod_1.z.number().nullable(),
        });
        Closed.fromData = (position) => ({
            ...references(position),
            avgPrice: position.avgPrice ?? null,
            curPrice: position.curPrice ?? null,
            totalBought: position.totalBought ?? null,
            realizedPnl: position.realizedPnl ?? null,
            timestamp: position.timestamp ?? null,
        });
    })(Closed = Position.Closed || (Position.Closed = {}));
})(Position || (exports.Position = Position = {}));
