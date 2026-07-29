import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { PolymarketPublicSDK } from "../sdk";


// The wallet address is a per-call argument, not node configuration — an agent asking about a
// portfolio is usually asking about a specific address it just learned, not a fixed one.
const walletParam = z.string()
    .describe("Wallet address to read (0x… , 40 hex characters). Any address works, not only your own.");

const limitParam = (maximum: number, fallback: number) =>
    z.number().int().min(1).max(maximum).default(fallback)
        .describe(`Maximum records to return (1-${maximum}).`);

const directionParam = z.enum(["DESC", "ASC"]).default("DESC")
    .describe("Sort direction.");


export function buildTools(polymarket: PolymarketPublicSDK) {

    const getPositions = tool(
        async ({ wallet, limit, sortBy, direction, redeemableOnly }) => {
            const positions = await polymarket.wallets.positions({
                wallet, limit, sortBy, direction, redeemableOnly,
            });

            return ToolBudget.list("positions", positions, { hint: "Lower the limit or raise the minimum size." });
        },
        {
            name:        "polymarket_profile_positions",
            description: "List a wallet's currently open positions, with size, current value and unrealised profit or loss. Use this to answer what someone holds right now.",
            schema: z.object({
                wallet:         walletParam,
                limit:          limitParam(500, 100),
                sortBy:         z.enum(["TOKENS", "CURRENT", "INITIAL", "CASHPNL", "PERCENTPNL", "PRICE", "AVGPRICE", "RESOLVING", "TITLE"])
                    .default("TOKENS").describe("Which field to order by."),
                direction:      directionParam,
                redeemableOnly: z.boolean().default(false).describe("Only positions in resolved markets that can be redeemed."),
            }),
        },
    );

    const getClosedPositions = tool(
        async ({ wallet, limit, sortBy, direction }) => {
            const positions = await polymarket.wallets.closedPositions({ wallet, limit, sortBy, direction });

            return ToolBudget.list("positions", positions, { hint: "Lower the limit." });
        },
        {
            name:        "polymarket_profile_closed_positions",
            description: "List a wallet's settled positions and the profit or loss actually realised on each. Use this for past performance, as opposed to current holdings.",
            schema: z.object({
                wallet:    walletParam,
                limit:     limitParam(50, 10),
                sortBy:    z.enum(["REALIZEDPNL", "TIMESTAMP", "PRICE", "AVGPRICE", "TITLE"])
                    .default("REALIZEDPNL").describe("Which field to order by."),
                direction: directionParam,
            }),
        },
    );

    const getActivity = tool(
        async ({ wallet, limit, type, direction }) => {
            const activity = await polymarket.wallets.activity({ wallet, limit, type, direction });

            return ToolBudget.list("activity", activity, { hint: "Lower the limit or filter by type." });
        },
        {
            name:        "polymarket_profile_activity",
            description: "List a wallet's transaction history — trades, splits, merges, redemptions, rewards and transfers — most recent first. Use this to see what a wallet did and when.",
            schema: z.object({
                wallet:    walletParam,
                limit:     limitParam(500, 100),
                type:      z.enum(["ALL", "TRADE", "SPLIT", "MERGE", "REDEEM", "REWARD", "DEPOSIT", "WITHDRAWAL"])
                    .default("ALL").describe("Restrict to one kind of activity."),
                direction: directionParam,
            }),
        },
    );

    const getValue = tool(
        async ({ wallet }) => {
            return ToolBudget.value(await polymarket.wallets.value(wallet));
        },
        {
            name:        "polymarket_profile_value",
            description: "Get the total current value of everything a wallet holds on Polymarket.",
            schema: z.object({
                wallet: walletParam,
            }),
        },
    );

    const getMarketsTraded = tool(
        async ({ wallet }) => {
            return ToolBudget.value(await polymarket.wallets.tradedMarkets(wallet));
        },
        {
            name:        "polymarket_profile_markets_traded",
            description: "Get how many distinct markets a wallet has ever traded — a rough measure of how active a trader it is.",
            schema: z.object({
                wallet: walletParam,
            }),
        },
    );

    const periodParam = z.enum(["DAY", "WEEK", "MONTH", "ALL"]).default("ALL")
        .describe("Period the ranking covers. Shorter periods rank far fewer wallets, so a trader missing from DAY may still place over ALL.");

    const rankedByParam = z.enum(["PNL", "VOL"]).default("PNL")
        .describe("Rank by profit or by traded volume.");

    const getRank = tool(
        async ({ wallet, period, rankedBy }) => {
            const leaderboard = await polymarket.wallets.rank({ wallet, period, rankedBy });

            return ToolBudget.value(leaderboard);
        },
        {
            name:        "polymarket_profile_rank",
            description: "Get one wallet's placing on the Polymarket trader leaderboard, by profit or by volume. Answers with nothing when the wallet did not place in that period, which is the normal case — most addresses never rank. Use polymarket_leaderboard to see who did.",
            schema: z.object({
                wallet:   walletParam,
                period:   periodParam,
                rankedBy: rankedByParam,
            }),
        },
    );

    const getLeaderboard = tool(
        async ({ period, rankedBy, limit }) => {
            const leaderboard = await polymarket.wallets.leaderboard({ period, rankedBy, limit });

            return ToolBudget.list("leaderboard", leaderboard, { hint: "Lower the limit." });
        },
        {
            name:        "polymarket_leaderboard",
            description: "List the top Polymarket traders by profit or by traded volume. Use this to find who the significant traders are in the first place — then polymarket_profile_positions or polymarket_profile_activity on a wallet from the list to see what they actually hold or did.",
            schema: z.object({
                period:   periodParam,
                rankedBy: rankedByParam,
                limit:    limitParam(50, 25),
            }),
        },
    );


    const getIdentity = tool(
        async ({ wallet }) => {
            return ToolBudget.value(await polymarket.wallets.identity(wallet));
        },
        {
            name:        "polymarket_profile_identity",
            description: "Look up the public profile behind a wallet address — display name, pseudonym, when the account was created, and its fee tier. Returns null when the address has no profile, which is the normal case. Use this to put a name to an address returned by another tool.",
            schema: z.object({
                wallet: walletParam,
            }),
        },
    );


    return [
        getIdentity,
        getPositions,
        getClosedPositions,
        getActivity,
        getValue,
        getMarketsTraded,
        getRank,
        getLeaderboard,
    ];
}
