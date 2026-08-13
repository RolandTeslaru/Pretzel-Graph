import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { HyperLiquidInfoClient } from "../client";
import { Blueprint } from "./blueprint";
import { buildTools, selectMids } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    readonly #info: HyperLiquidInfoClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        this.#info = new HyperLiquidInfoClient(this.httpClientFactory);
    }


    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(this.#info),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;


        switch (fields.resource) {
            case "markets": {
                const markets = fields.marketKind === "spot"
                    ? await this.#info.spotMarkets()
                    : await this.#info.perpetualMarkets({ dex: fields.marketsDex });

                return {
                    markets: markets.slice(0, fields.marketsLimit),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "mids": {
                const mids = await this.#info.mids({ dex: fields.midsDex });
                return {
                    mids: selectMids(mids, fields.midsCoin, fields.midsLimit),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "candles": {
                const endTime = Date.now();
                return {
                    candles: await this.#info.candles({
                        coin:      fields.candlesCoin,
                        interval:  fields.candlesInterval,
                        startTime: endTime - fields.candlesLookbackHours * 60 * 60 * 1_000,
                        endTime,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "orderBook":
                return {
                    orderBook: await this.#info.orderBook({
                        coin:  fields.orderBookCoin,
                        depth: fields.orderBookDepth,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }
    }
}
