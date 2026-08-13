import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain"

import {
    createAlpacaClient,
    parseAlpacaCredentials,
} from "../client"
import { AlpacaMarketService } from "../services"
import { Blueprint } from "./blueprint"
import { buildTools } from "./tools"


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues
        const market = this.market

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(market),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>

        switch (fields.resource) {
            case "assets":
                if (fields.assetsAction === "list")
                    return {
                        assets: await market.assets.list({
                            query:      fields.assetsQuery,
                            status:     fields.assetsStatus,
                            assetClass: fields.assetsClass === "all" ? undefined : fields.assetsClass,
                            exchange:   fields.assetsExchange,
                            limit:      fields.assetsLimit,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                return {
                    asset: await market.assets.get(fields.assetSymbolOrId),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "clock":
                return {
                    clock: await market.clock(),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "calendar":
                return {
                    calendar: await market.calendar({
                        start: fields.calendarRange.from,
                        end:   fields.calendarRange.to,
                        limit: fields.calendarLimit,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "bars":
                return {
                    bars: await market.bars({
                        assetClass: fields.barsAssetClass,
                        symbol:     fields.barsSymbol,
                        unit:       fields.barsUnit,
                        multiplier: fields.barsMultiplier,
                        start:      fields.barsStart,
                        end:        fields.barsEnd,
                        limit:      fields.barsLimit,
                        feed:       fields.barsFeed,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "trades":
                return {
                    trades: await market.trades({
                        assetClass: fields.tradesAssetClass,
                        symbol:     fields.tradesSymbol,
                        start:      fields.tradesStart,
                        end:        fields.tradesEnd,
                        limit:      fields.tradesLimit,
                        feed:       fields.tradesFeed,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "quotes":
                return {
                    quotes: await market.quotes({
                        assetClass: fields.quotesAssetClass,
                        symbol:     fields.quotesSymbol,
                        start:      fields.quotesStart,
                        end:        fields.quotesEnd,
                        limit:      fields.quotesLimit,
                        feed:       fields.quotesFeed,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "snapshot":
                return {
                    snapshot: await market.snapshot({
                        assetClass: fields.snapshotAssetClass,
                        symbol:     fields.snapshotSymbol,
                        feed:       fields.snapshotFeed,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "news":
                return {
                    news: await market.news({
                        symbols: fields.newsSymbols,
                        start:   fields.newsStart,
                        end:     fields.newsEnd,
                        limit:   fields.newsLimit,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "options":
                if (fields.optionsAction === "listContracts")
                    return {
                        contracts: await market.optionContracts.list({
                            underlyingSymbols: fields.contractsUnderlyings,
                            status:            fields.contractsStatus,
                            type:              fields.contractsType === "all" ? undefined : fields.contractsType,
                            expirationDate:    fields.contractsExpiration,
                            limit:             fields.contractsLimit,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                if (fields.optionsAction === "getContract")
                    return {
                        contract: await market.optionContracts.get(fields.contractSymbolOrId),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                return {
                    chain: await market.optionChain({
                        underlyingSymbol: fields.chainUnderlying,
                        type:             fields.chainType === "all" ? undefined : fields.chainType,
                        expirationDate:   fields.chainExpiration,
                        strikeFrom:       fields.chainStrikeFrom,
                        strikeTo:         fields.chainStrikeTo,
                        limit:            fields.chainLimit,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>

            case "screener":
                if (fields.screenerView === "mostActive")
                    return {
                        active: await market.mostActives({
                            by:    fields.activeBy,
                            limit: fields.activeLimit,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>

                return {
                    movers: await market.movers({
                        marketType: fields.moversMarket,
                        limit:      fields.moversLimit,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>
        }
    }


    #market: AlpacaMarketService | undefined

    private get market(): AlpacaMarketService {
        if (this.#market)
            return this.#market

        const instance = this.credentials.alpacaApi
        if (!instance)
            throw new Error("Alpaca Market: attach an Alpaca credential.")

        const values = this.context.credentialsAPI.getDecryptedValue(instance.blob)
        const client = createAlpacaClient(
            this.httpClientFactory,
            parseAlpacaCredentials(values),
        )

        return (this.#market = new AlpacaMarketService(client))
    }


    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context)
    }
}
