"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
const zod_1 = require("zod");
/**
 * Something a wallet did — a fill, a split, a merge, a redemption, a reward.
 *
 * One type for two endpoints: `/activity` is a wallet's history, `/trades` is a market's public
 * fills, and a trade is exactly an activity whose `type` is TRADE. The Data shapes bear that out —
 * the trade schema is a strict subset of the activity schema, with no field of its own.
 *
 * The market and token references are nested rather than flattened across the row. They aren't
 * `Market.Ref` and `Token`: Data identifies a market by conditionId, question and slugs, with no
 * Gamma id or groupItemTitle, so this is the same idea built from what this API actually has.
 */
var Activity;
(function (Activity) {
    /** Empty strings, not nulls, are how Data signals "not applicable" — a REDEEM has no side. */
    const text = (value) => value ? value : null;
    Activity.MarketRef = zod_1.z.object({
        conditionId: zod_1.z.string().nullable(),
        question: zod_1.z.string().nullable(),
        slug: zod_1.z.string().nullable(),
        eventSlug: zod_1.z.string().nullable(),
    });
    /** Not every market is Yes/No — `outcome` is "Republican" on a party market. */
    Activity.TokenRef = zod_1.z.object({
        id: zod_1.z.string().nullable(),
        outcome: zod_1.z.string().nullable(),
        index: zod_1.z.number().int().nullable(),
    });
    Activity.Schema = zod_1.z.object({
        wallet: zod_1.z.string().nullable(),
        timestamp: zod_1.z.number().nullable(),
        market: Activity.MarketRef,
        token: Activity.TokenRef,
        /** TRADE, SPLIT, MERGE, REDEEM, REWARD, DEPOSIT, WITHDRAWAL. */
        type: zod_1.z.string().nullable(),
        side: zod_1.z.string().nullable(),
        /** Token count. `usdcSize` is the same movement in dollars. */
        size: zod_1.z.number().nullable(),
        usdcSize: zod_1.z.number().nullable(),
        price: zod_1.z.number().nullable(),
        transactionHash: zod_1.z.string().nullable(),
    });
    Activity.fromData = (activity) => ({
        wallet: activity.proxyWallet ?? null,
        timestamp: activity.timestamp ?? null,
        market: {
            conditionId: text(activity.conditionId),
            question: text(activity.title),
            slug: text(activity.slug),
            eventSlug: text(activity.eventSlug),
        },
        token: {
            id: text(activity.asset),
            outcome: text(activity.outcome),
            index: activity.outcomeIndex ?? null,
        },
        type: text(activity.type),
        side: text(activity.side),
        size: activity.size ?? null,
        usdcSize: activity.usdcSize ?? null,
        price: activity.price ?? null,
        transactionHash: text(activity.transactionHash),
    });
    /** A market's public fills. Same shape; `type` is always TRADE, so Data omits it. */
    Activity.fromTrade = (trade) => ({
        ...Activity.fromData({ ...trade, type: "TRADE" }),
        type: "TRADE",
    });
})(Activity || (exports.Activity = Activity = {}));
