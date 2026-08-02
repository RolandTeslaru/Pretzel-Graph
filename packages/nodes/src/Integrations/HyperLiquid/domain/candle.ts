import { z } from "zod";

import { HyperLiquidAPI } from "./api";


export namespace Candle {

    export const Schema = z.object({
        openTime:  z.number().int(),
        closeTime: z.number().int(),
        coin:      z.string(),
        interval:  HyperLiquidAPI.CandleInterval,
        open:      z.string(),
        close:     z.string(),
        high:      z.string(),
        low:       z.string(),
        volume:    z.string(),
        trades:    z.number().int().nonnegative(),
    });

    export const fromAPI = (candle: z.infer<typeof HyperLiquidAPI.Candle>): Candle => ({
        openTime:  candle.t,
        closeTime: candle.T,
        coin:      candle.s,
        interval:  candle.i,
        open:      candle.o,
        close:     candle.c,
        high:      candle.h,
        low:       candle.l,
        volume:    candle.v,
        trades:    candle.n,
    });
}

export type Candle = z.infer<typeof Candle.Schema>;
