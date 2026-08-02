import { z } from "zod";

import { HyperLiquidAPI } from "./api";


export namespace Account {

    export const Margin = HyperLiquidAPI.MarginSummary;

    export const State = z.object({
        dex:                        z.string(),
        time:                       z.number().int().nullable(),
        margin:                     Margin,
        crossMargin:                Margin,
        crossMaintenanceMarginUsed: z.string().nullable(),
        withdrawable:               z.string(),
    });

    export const Position = HyperLiquidAPI.Position;
    export const OpenOrder = HyperLiquidAPI.OpenOrder;
    export const Fill = HyperLiquidAPI.Fill;
    export const FundingPayment = HyperLiquidAPI.FundingPayment;
    export const SpotBalance = HyperLiquidAPI.SpotBalance;


    export const stateFromAPI = (
        dex: string,
        state: z.infer<typeof HyperLiquidAPI.ClearinghouseState>,
    ): z.infer<typeof State> => ({
        dex,
        time:                       state.time ?? null,
        margin:                     state.marginSummary,
        crossMargin:                state.crossMarginSummary,
        crossMaintenanceMarginUsed: state.crossMaintenanceMarginUsed ?? null,
        withdrawable:               state.withdrawable,
    });

    export const positionsFromAPI = (
        state: z.infer<typeof HyperLiquidAPI.ClearinghouseState>,
    ): Position[] => state.assetPositions.map(value => value.position);
}

export type AccountState = z.infer<typeof Account.State>;
export type Position = z.infer<typeof Account.Position>;
export type OpenOrder = z.infer<typeof Account.OpenOrder>;
export type Fill = z.infer<typeof Account.Fill>;
export type FundingPayment = z.infer<typeof Account.FundingPayment>;
export type SpotBalance = z.infer<typeof Account.SpotBalance>;
