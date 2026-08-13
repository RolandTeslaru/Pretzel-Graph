import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain"

import {
    createAlpacaClient,
    parseAlpacaCredentials,
} from "../client"
import { AlpacaAccountService } from "../services"
import { Blueprint } from "./blueprint"
import { buildTools } from "./tools"


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields  = this.fieldValues
        const account = this.account

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(account),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>

        switch (fields.resource) {
            case "summary":
                return {
                    account: await account.summary(),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "configuration":
                return {
                    configuration: await account.configuration(),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "positions":
                if (fields.positionsAction === "list")
                    return {
                        positions: await account.positions.list(),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                return {
                    position: await account.positions.get(fields.positionSymbolOrId),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "orders":
                if (fields.ordersAction === "list")
                    return {
                        orders: await account.orders.list({
                            status:    fields.ordersStatus,
                            symbols:   fields.ordersSymbols,
                            side:      fields.ordersSide === "all" ? undefined : fields.ordersSide,
                            direction: fields.ordersDirection,
                            after:     fields.ordersAfter,
                            until:     fields.ordersUntil,
                            limit:     fields.ordersLimit,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                return {
                    order: await account.orders.get(fields.orderId),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "activities":
                return {
                    activities: await account.activities({
                        activityTypes: fields.activityTypes,
                        category:      fields.activityCategory === "all" ? undefined : fields.activityCategory,
                        direction:     fields.activityDirection,
                        after:         fields.activityAfter,
                        until:         fields.activityUntil,
                        limit:         fields.activityLimit,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "portfolio":
                return {
                    portfolio: await account.portfolio({
                        period:        fields.portfolioPeriod,
                        timeframe:     fields.portfolioTimeframe,
                        start:         fields.portfolioStart,
                        end:           fields.portfolioEnd,
                        extendedHours: fields.portfolioExtendedHours,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "watchlists":
                if (fields.watchlistsAction === "list")
                    return {
                        watchlists: await account.watchlists.list(),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                return {
                    watchlist: await account.watchlists.get({
                        id:   fields.watchlistId,
                        name: fields.watchlistName,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>
        }
    }


    #account: AlpacaAccountService | undefined

    private get account(): AlpacaAccountService {
        if (this.#account)
            return this.#account

        const instance = this.credentials.alpacaApi
        if (!instance)
            throw new Error("Alpaca Account: attach an Alpaca credential.")

        const values = this.context.credentialsAPI.getDecryptedValue(instance.blob)
        const client = createAlpacaClient(
            this.httpClientFactory,
            parseAlpacaCredentials(values),
        )

        return (this.#account = new AlpacaAccountService(client))
    }


    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context)
    }
}
