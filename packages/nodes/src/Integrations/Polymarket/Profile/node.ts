import {
    RegisterNode,
    RuntimeNode,
    type InferOutputs,
} from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { PolymarketPublicSDK } from "../sdk";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields     = this.fieldValues;
        const polymarket = this.polymarket;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(polymarket),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        // The address is validated inside the SDK, once, rather than at each branch here.
        const wallet = fields.walletAddress;

        switch (fields.resource) {

            case "positions":
                return {
                    positions: await polymarket.wallets.positions({
                        wallet,
                        limit:          fields.positionsMaxResults,
                        minSize:        fields.positionsSizeThreshold,
                        redeemableOnly: fields.positionsRedeemableOnly,
                        sortBy:         fields.positionsSortBy,
                        direction:      fields.positionsSortDirection,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "closedPositions":
                return {
                    positions: await polymarket.wallets.closedPositions({
                        wallet,
                        limit:     fields.closedMaxResults,
                        sortBy:    fields.closedSortBy,
                        direction: fields.closedSortDirection,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "activity":
                return {
                    activity: await polymarket.wallets.activity({
                        wallet,
                        limit:     fields.activityMaxResults,
                        type:      fields.activityType,
                        direction: fields.activitySortDirection,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "value":
                return {
                    value: await polymarket.wallets.value(wallet),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "tradedMarkets":
                return {
                    traded: await polymarket.wallets.tradedMarkets(wallet),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "identity":
                return {
                    profile: await polymarket.wallets.identity(wallet),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {
            leaderboard: await polymarket.wallets.rank({
                wallet,
                period:   fields.rankTimePeriod,
                rankedBy: fields.rankOrderBy,
            }),
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }

    private readonly polymarket: PolymarketPublicSDK;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        this.polymarket = new PolymarketPublicSDK(this.httpClientFactory);
    }
}
