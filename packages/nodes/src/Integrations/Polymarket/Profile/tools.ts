import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import type { PolymarketDataClient, PolymarketGammaClient } from "../client";
import { Polymarket } from "../domain";


export interface ToolClients {
    data:  PolymarketDataClient;
    gamma: PolymarketGammaClient;
}


// The wallet address is a per-call argument, not node configuration — an agent asking about a
// portfolio is usually asking about a specific address it just learned, not a fixed one.
const walletParam = z.string()
    .describe("Wallet address to read (0x… , 40 hex characters). Any address works, not only your own.");

const limitParam = (maximum: number, fallback: number) =>
    z.number().int().min(1).max(maximum).default(fallback)
        .describe(`Maximum records to return (1-${maximum}).`);

const directionParam = z.enum(["DESC", "ASC"]).default("DESC")
    .describe("Sort direction.");


export function buildTools(clients: ToolClients) {

    const getPositions = tool(
        async ({ wallet, limit, sortBy, direction, redeemableOnly }) => {
            const positions = await clients.data.positions.listCurrent({
                user:          Polymarket.Data.Common.WalletAddress.parse(wallet),
                limit,
                sortBy,
                sortDirection: direction,
                redeemable:    redeemableOnly,
            });

            return JSON.stringify({ count: positions.length, positions });
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
            const positions = await clients.data.positions.listClosed({
                user:          Polymarket.Data.Common.WalletAddress.parse(wallet),
                limit,
                sortBy,
                sortDirection: direction,
            });

            return JSON.stringify({ count: positions.length, positions });
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
            const activity = await clients.data.activity.list({
                user:          Polymarket.Data.Common.WalletAddress.parse(wallet),
                limit,
                type:          type === "ALL" ? undefined : [Polymarket.Data.Activity.Type.parse(type)],
                sortDirection: direction,
            });

            return JSON.stringify({ count: activity.length, activity });
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
            const value = await clients.data.users.getValue({
                user: Polymarket.Data.Common.WalletAddress.parse(wallet),
            });

            return JSON.stringify(value);
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
            const traded = await clients.data.users.getTradedMarketCount({
                user: Polymarket.Data.Common.WalletAddress.parse(wallet),
            });

            return JSON.stringify(traded);
        },
        {
            name:        "polymarket_profile_markets_traded",
            description: "Get how many distinct markets a wallet has ever traded — a rough measure of how active a trader it is.",
            schema: z.object({
                wallet: walletParam,
            }),
        },
    );

    const getRank = tool(
        async ({ wallet, period, rankedBy, limit }) => {
            const leaderboard = await clients.data.leaderboard.list({
                user:       Polymarket.Data.Common.WalletAddress.parse(wallet),
                timePeriod: period,
                orderBy:    rankedBy,
                limit,
            });

            return JSON.stringify({ count: leaderboard.length, leaderboard });
        },
        {
            name:        "polymarket_profile_rank",
            description: "Get a wallet's placing on the Polymarket trader leaderboard, by profit or by volume, over a given period.",
            schema: z.object({
                wallet:   walletParam,
                period:   z.enum(["DAY", "WEEK", "MONTH", "ALL"]).default("DAY").describe("Period the ranking covers."),
                rankedBy: z.enum(["PNL", "VOL"]).default("PNL").describe("Rank by profit or by traded volume."),
                limit:    limitParam(50, 25),
            }),
        },
    );


    const getIdentity = tool(
        async ({ wallet }) => {
            const profile = await clients.gamma.profiles.getPublic({
                address: Polymarket.Gamma.Common.WalletAddress.parse(wallet),
            });

            return JSON.stringify(profile);
        },
        {
            name:        "polymarket_profile_identity",
            description: "Look up the public profile behind a wallet address — display name, pseudonym, bio, X handle and badges. Use this to put a name to an address returned by another tool.",
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
    ];
}
