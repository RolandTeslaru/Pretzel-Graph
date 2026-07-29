import type { ExchangeStatus as APIExchangeStatus } from "kalshi-typescript"
import { z } from "zod"


export namespace Exchange {

    export const Status = z.object({
        active:          z.boolean(),
        tradingActive:   z.boolean(),
        transfersActive: z.boolean().nullable(),
        estimatedResumeTime: z.string().nullable(),
    })

    export type Status = z.infer<typeof Status>


    export const fromAPI = (status: APIExchangeStatus): Status => ({
        active:              status.exchange_active,
        tradingActive:       status.trading_active,
        transfersActive:     status.intra_exchange_transfers_active ?? null,
        estimatedResumeTime: status.exchange_estimated_resume_time ?? null,
    })
}
