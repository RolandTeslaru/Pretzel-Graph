import {
    RegisterNode,
    RuntimeNode,
    type InferOutputs,
} from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { PolymarketReadOnlyCLOBClient } from "../client";
import { Polymarket } from "../domain";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues;
        const clob   = this.clob;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(clob),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        switch (fields.resource) {

            case "openOrders":
                return {
                    orders: await clob.orders.listOpen({
                        market:   optional(fields.openOrdersConditionId),
                        asset_id: optional(fields.openOrdersTokenId),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "order":
                return {
                    order: await clob.orders.get({ order_id: fields.orderId }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "trades":
                return {
                    trades: await clob.trades.list({
                        market:          optional(fields.tradesConditionId),
                        asset_id:        optional(fields.tradesTokenId),
                        only_first_page: fields.tradesOnlyFirstPage,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "balance":
                return {
                    balance: await clob.balances.getAllowance({
                        asset_type: fields.balanceAssetType,
                        token_id:   fields.balanceAssetType === "CONDITIONAL"
                            ? fields.balanceTokenId
                            : undefined,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            // areScoring covers one id as readily as many, so the output shape stays a map either
            // way rather than changing with the length of the list.
            case "scoring":
                return {
                    scoring: await clob.orders.areScoring({
                        order_ids: fields.scoringOrderIds,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "settings":
                return {
                    settings: await clob.account.getClosedOnlyMode(),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        switch (fields.rewardsView) {

            case "earnings":
                return {
                    earnings: await clob.rewards.listDailyEarnings({ date: fields.earningsDate }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "totals":
                return {
                    totals: await clob.rewards.listDailyTotals({ date: fields.totalsDate }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "markets":
                return {
                    markets: await clob.rewards.listUserMarkets({ date: fields.rewardMarketsDate }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {
            percentages: await clob.rewards.getPercentages(),
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }


    #client: PolymarketReadOnlyCLOBClient | undefined;

    // Built on first use, not in the constructor: every node in a workflow is instantiated at
    // compile time, and a missing credential should fail this node's run rather than the compile.
    private get clob(): PolymarketReadOnlyCLOBClient {
        if (this.#client)
            return this.#client;

        const instance = this.credentials.polymarketApiKey;

        if (!instance)
            throw new Error("Polymarket Account: attach a Polymarket API Key credential.");

        const { signerAddress, apiKey, apiSecret, passphrase } =
            this.context.credentialsAPI.getDecryptedValue(instance.blob);

        this.#client = new PolymarketReadOnlyCLOBClient(
            {
                signerAddress: Polymarket.CLOB.Common.WalletAddress.parse(signerAddress),
                apiKey,
                apiSecret,
                passphrase,
            },
            this.httpClientFactory,
        );

        return this.#client;
    }

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
    }
}


// Gamma and CLOB read an empty filter as "no filter", but only if it's absent — an empty string
// reaches the query as `market=` and matches nothing.
const optional = (value: string | undefined): string | undefined =>
    value?.trim() ? value.trim() : undefined;
