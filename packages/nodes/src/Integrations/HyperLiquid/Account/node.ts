import {
    RegisterNode,
    RuntimeNode,
    type InferOutputs,
} from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { HyperLiquidInfoClient } from "../client";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


@RegisterNode(Blueprint.id)
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
                tools: buildTools(this.#info, {
                    address: fields.address,
                    dex:     fields.dex,
                }),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;


        switch (fields.resource) {
            case "state":
                return {
                    state: (await this.#info.accountState({
                        user: fields.address,
                        dex:  fields.dex,
                    })).state,
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "positions":
                return {
                    positions: (await this.#info.accountState({
                        user: fields.address,
                        dex:  fields.dex,
                    })).positions,
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "spotBalances":
                return {
                    spotBalances: await this.#info.spotBalances(fields.address),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "openOrders":
                return {
                    openOrders: await this.#info.openOrders({
                        user: fields.address,
                        dex:  fields.dex,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "fills": {
                const endTime = Date.now();
                return {
                    fills: await this.#info.fills({
                        user:            fields.address,
                        startTime:       endTime - fields.fillsLookbackHours * 60 * 60 * 1_000,
                        endTime,
                        maxResults:      fields.fillsLimit,
                        aggregateByTime: fields.fillsAggregateByTime,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "funding": {
                const endTime = Date.now();
                return {
                    funding: await this.#info.funding({
                        user:       fields.address,
                        startTime:  endTime - fields.fundingLookbackHours * 60 * 60 * 1_000,
                        endTime,
                        maxResults: fields.fundingLimit,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }
        }
    }
}
