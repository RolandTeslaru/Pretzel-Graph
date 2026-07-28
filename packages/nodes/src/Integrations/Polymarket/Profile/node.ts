import {
    RegisterNode,
    RuntimeNode,
    type InferOutputs,
} from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { PolymarketDataClient, PolymarketGammaClient } from "../client";
import { Polymarket } from "../domain";
import { PolymarketPublicSDK } from "../sdk";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields  = this.fieldValues;
        const clients = { data: this.dataClient, gamma: this.gammaClient };

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(this.polymarket),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const user = Polymarket.Data.Common.WalletAddress.parse(fields.walletAddress);

        switch (fields.resource) {

            case "positions":
                return {
                    positions: await clients.data.positions.listCurrent({
                        user,
                        limit:         fields.positionsMaxResults,
                        sizeThreshold: fields.positionsSizeThreshold,
                        redeemable:    fields.positionsRedeemableOnly,
                        sortBy:        fields.positionsSortBy,
                        sortDirection: fields.positionsSortDirection,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "closedPositions":
                return {
                    positions: await clients.data.positions.listClosed({
                        user,
                        limit:         fields.closedMaxResults,
                        sortBy:        fields.closedSortBy,
                        sortDirection: fields.closedSortDirection,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "activity":
                return {
                    activity: await clients.data.activity.list({
                        user,
                        limit:         fields.activityMaxResults,
                        type:          fields.activityType === "ALL"
                            ? undefined
                            : [Polymarket.Data.Activity.Type.parse(fields.activityType)],
                        sortDirection: fields.activitySortDirection,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "value":
                return {
                    value: await clients.data.users.getValue({ user }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "tradedMarkets":
                return {
                    traded: await clients.data.users.getTradedMarketCount({ user }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "identity":
                return {
                    profile: await clients.gamma.profiles.getPublic({
                        address: Polymarket.Gamma.Common.WalletAddress.parse(fields.walletAddress),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {
            leaderboard: await clients.data.leaderboard.list({
                user,
                timePeriod: fields.rankTimePeriod,
                orderBy:    fields.rankOrderBy,
            }),
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }

    private readonly polymarket:  PolymarketPublicSDK;
    private readonly dataClient:  PolymarketDataClient;
    private readonly gammaClient: PolymarketGammaClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        this.polymarket  = new PolymarketPublicSDK(this.httpClientFactory);
        this.dataClient  = new PolymarketDataClient(this.httpClientFactory);
        this.gammaClient = new PolymarketGammaClient(this.httpClientFactory);
    }
}
